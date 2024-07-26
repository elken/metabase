import { useCallback, useEffect, useMemo, useState } from "react";
import type { InjectedRouter, Route } from "react-router";
import { withRouter } from "react-router";
import { t } from "ttag";
import _ from "underscore";

import { StrategyForm } from "metabase/admin/performance/components/StrategyForm";
import { rootId } from "metabase/admin/performance/constants/simple";
import { useCacheConfigs } from "metabase/admin/performance/hooks/useCacheConfigs";
import { useConfirmIfFormIsDirty } from "metabase/admin/performance/hooks/useConfirmIfFormIsDirty";
import { useSaveStrategy } from "metabase/admin/performance/hooks/useSaveStrategy";
import { getShortStrategyLabel } from "metabase/admin/performance/utils";
import { useSearchQuery } from "metabase/api";
import type { ColumnItem } from "metabase/common/components/Table";
import { DelayedLoadingAndErrorWrapper } from "metabase/components/LoadingAndErrorWrapper/DelayedLoadingAndErrorWrapper";
import { Center, Flex, Skeleton, Stack } from "metabase/ui";
import { Repeat } from "metabase/ui/components/feedback/Skeleton/Repeat";
import type { CacheableModel } from "metabase-types/api";
import { CacheDurationUnit } from "metabase-types/api";

import type {
  CacheableItem,
  DashboardResult,
  QuestionResult,
  UpdateTarget,
} from "../types";

import {
  CacheableItemTable,
  StrategyFormPanel,
} from "./StrategyEditorForQuestionsAndDashboards.styled";
import { TableRowForCacheableItem } from "./TableRowForCacheableItem";
import { getConstants } from "./constants";

type CacheableItemResult = DashboardResult | QuestionResult;

const StrategyEditorForQuestionsAndDashboards_Base = ({
  router,
  route,
}: {
  router: InjectedRouter;
  route?: Route;
}) => {
  const [
    // The targetId is the id of the object that is currently being edited
    targetId,
    setTargetId,
  ] = useState<number | null>(null);

  const { tableColumns } = useMemo(() => getConstants(), []);

  const [targetModel, setTargetModel] = useState<CacheableModel | null>(null);

  const configurableModels: CacheableModel[] = useMemo(
    () => ["dashboard", "question"],
    [],
  );

  const {
    configs,
    setConfigs,
    error: configsError,
    loading: areConfigsLoading,
  } = useCacheConfigs({ configurableModels });

  // TODO: Handle situation where there are no overrides. At the moment, the skeleton is shown in this situation
  //
  // FIXME: If possible, just get the specific objects with overrides, looking them up by id and model
  const searchResult = useSearchQuery({
    models: ["dashboard", "card"],
  });

  const dashboardsAndQuestions = useMemo(
    () => (searchResult.data?.data || []) as CacheableItemResult[],
    [searchResult.data],
  );

  const cacheableItems = useMemo(() => {
    const items = new Map<string, CacheableItem>();
    for (const config of configs) {
      items.set(`${config.model}${config.model_id}`, {
        ..._.omit(config, "model_id"),
        id: config.model_id,
      });
    }

    // Hydrate data from the search results into the cacheable items
    for (const result of dashboardsAndQuestions ?? []) {
      const normalizedModel =
        result.model === "card" ? "question" : result.model;
      const item = items.get(`${normalizedModel}${result.id}`);
      if (item) {
        item.name = result.name;
        item.collection = result.collection;
      }
    }
    // Filter out items that have no match in the dashboard and question list
    const hydratedCacheableItems: CacheableItem[] = [...items.values()].filter(
      item => item.name !== undefined,
    );

    return hydratedCacheableItems;
  }, [configs, dashboardsAndQuestions]);

  useEffect(
    /** When the user configures an item to 'Use default' and that item
     * disappears from the table, it should no longer be the target */
    function removeTargetIfNoLongerInTable() {
      const isTargetIdInTable = cacheableItems.some(
        item => item.id === targetId,
      );
      if (targetId !== null && !isTargetIdInTable) {
        setTargetId(null);
        setTargetModel(null);
      }
    },
    [targetId, cacheableItems],
  );

  /** The config for the object currently being edited */
  const targetConfig = targetModel
    ? _.findWhere(configs, {
        model_id: targetId ?? undefined,
        model: targetModel,
      })
    : undefined;
  const savedStrategy = targetConfig?.strategy;

  const targetName = useMemo(() => {
    if (targetId === null || targetModel === null) {
      return;
    }
    const item = _.findWhere(cacheableItems, {
      id: targetId,
      model: targetModel,
    });
    return item?.name;
  }, [targetId, targetModel, cacheableItems]);

  if (savedStrategy?.type === "duration") {
    savedStrategy.unit = CacheDurationUnit.Hours;
  }

  const {
    askBeforeDiscardingChanges,
    confirmationModal,
    isStrategyFormDirty,
    setIsStrategyFormDirty,
  } = useConfirmIfFormIsDirty(router, route);

  /** Change the target, but first confirm if the form is unsaved */
  const updateTarget: UpdateTarget = useCallback(
    ({ id: newTargetId, model: newTargetModel }, isFormDirty) => {
      if (targetId !== newTargetId || targetModel !== newTargetModel) {
        const update = () => {
          setTargetId(newTargetId);
          setTargetModel(newTargetModel);
        };
        isFormDirty ? askBeforeDiscardingChanges(update) : update();
      }
    },
    [
      targetId,
      targetModel,
      setTargetId,
      setTargetModel,
      askBeforeDiscardingChanges,
    ],
  );

  const saveStrategy = useSaveStrategy(
    targetId,
    configs,
    setConfigs,
    targetModel,
  );

  const error = configsError;
  const loading = areConfigsLoading;

  const rowRenderer = useCallback(
    (item: CacheableItem) => (
      <TableRowForCacheableItem
        updateTarget={updateTarget}
        currentTargetId={targetId}
        currentTargetModel={targetModel}
        forId={item.id}
        item={item}
        isFormDirty={isStrategyFormDirty}
      />
    ),
    [updateTarget, targetId, targetModel, isStrategyFormDirty],
  );

  // FIXME: Leaving unsaved changes in the form does not generate a confirmation modal
  const explanatoryAsideId = "mb-explanatory-aside";

  return (
    <Flex
      role="region"
      aria-label={t`Dashboard and question caching`}
      w="100%"
      direction="row"
      // FIXME: check this gap against Figma
      justify="space-between"
    >
      <Stack
        spacing="sm"
        lh="1.5rem"
        pt="md"
        pb="md"
        px="2.5rem"
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <aside id={explanatoryAsideId}>
          {t`Here are the dashboards and questions that have their own caching policies, which override any default or database policies you’ve set.`}
        </aside>
        {confirmationModal}
        <Flex maw="60rem">
          <DelayedLoadingAndErrorWrapper
            error={error}
            loading={loading}
            loader={<TableSkeleton columns={tableColumns} />}
          >
            <Flex align="flex-start">
              <CacheableItemTable<CacheableItem>
                columns={tableColumns}
                rows={cacheableItems}
                rowRenderer={rowRenderer}
                defaultSortColumn="name"
                defaultSortDirection="asc"
                formatValueForSorting={(
                  row: CacheableItem,
                  columnName: string,
                ) => {
                  if (columnName === "policy") {
                    return getShortStrategyLabel(row.strategy, row.model);
                  } else {
                    return _.get(row, columnName);
                  }
                }}
                ifEmpty={<EmptyTable />}
                aria-labelledby={explanatoryAsideId}
              >
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>
              </CacheableItemTable>
            </Flex>
          </DelayedLoadingAndErrorWrapper>
        </Flex>
      </Stack>

      {targetId !== null && targetModel !== null && (
        <StrategyFormPanel>
          <StrategyForm
            targetId={targetId}
            targetModel={targetModel}
            targetName={targetName ?? `Untitled ${targetModel}`}
            setIsDirty={setIsStrategyFormDirty}
            saveStrategy={saveStrategy}
            savedStrategy={savedStrategy}
            shouldAllowInvalidation={true}
            shouldShowName={targetId !== rootId}
          />
        </StrategyFormPanel>
      )}
    </Flex>
  );
};

export const StrategyEditorForQuestionsAndDashboards = withRouter(
  StrategyEditorForQuestionsAndDashboards_Base,
);

const TableSkeleton = ({ columns }: { columns: ColumnItem[] }) => (
  <CacheableItemTable<{ id: number }>
    columns={columns}
    rows={[{ id: 0 }, { id: 1 }, { id: 2 }]}
    rowRenderer={() => (
      <tr>
        <Repeat times={3}>
          <td style={{ width: "10rem" }}>
            <Skeleton h="1rem" natural />
          </td>
        </Repeat>
      </tr>
    )}
  />
);

const EmptyTable = () => (
  <tr>
    <td colSpan={3}>
      <Center fw="bold" c="text-light">
        {t`No dashboards or questions have their own caching policies yet.`}
      </Center>
    </td>
  </tr>
);
