import styled from "@emotion/styled";

import { Panel } from "metabase/admin/performance/components/StrategyEditorForDatabases.styled";
import { StyledTable } from "metabase/common/components/Table";
import { breakpointMaxLarge } from "metabase/styled-components/theme";

/** The table of "overrides" - i.e., the table of dashboards and questions with policies that override other, more general policies */
export const CacheableItemTable = styled(StyledTable)`
  table-layout: fixed;
  background-color: var(--mb-color-text-white);

  td {
    padding: 1rem;
  }
` as typeof StyledTable;

export const StrategyFormPanel = styled(Panel)`
  border-inline-start: 1px solid var(--mb-color-border);
  max-width: 30rem;
  ${breakpointMaxLarge} {
    max-width: 25rem;
  }
`;
