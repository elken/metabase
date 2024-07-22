import { getShortStrategyLabel } from "metabase/admin/performance/utils";
import { CollectionBreadcrumbsWithTooltip } from "metabase/browse/components/CollectionBreadcrumbsWithTooltip";
import { Ellipsified } from "metabase/core/components/Ellipsified";
import { Button, Box } from "metabase/ui";
import type { CacheableModel } from "metabase-types/api";

import type { UpdateTarget, CacheableItem } from "../types";

export const TableRowForCacheableItem = ({
  item,
  currentTargetId,
  currentTargetModel,
  updateTarget,
  isFormDirty,
}: {
  item: CacheableItem;
  forId: number;
  currentTargetId: number | null;
  currentTargetModel: CacheableModel | null;
  updateTarget: UpdateTarget;
  isFormDirty: boolean;
}) => {
  const { name, id, collection, model, strategy } = item;

  const launchForm = () => {
    if (currentTargetId !== item.id || currentTargetModel !== item.model) {
      updateTarget({ id, model }, isFormDirty);
    }
  };
  const isCurrent = currentTargetId === id && currentTargetModel === model;
  return (
    <Box
      component="tr"
      bg={isCurrent ? "var(--mb-color-brand-lighter)" : undefined}
    >
      <td>
        <Ellipsified>{name}</Ellipsified>
      </td>
      <td>
        {collection && (
          <CollectionBreadcrumbsWithTooltip
            containerName={`mb-breadcrumbs-for-${name}`}
            collection={collection}
            isLink={false}
          />
        )}
      </td>
      <td>
        <Button variant="subtle" p={0} onClick={launchForm}>
          {getShortStrategyLabel(strategy)}
        </Button>
      </td>
    </Box>
  );
};
