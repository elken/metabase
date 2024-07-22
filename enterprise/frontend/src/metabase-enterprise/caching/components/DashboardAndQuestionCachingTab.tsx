import { Tab } from "metabase/admin/performance/components/PerformanceApp.styled";
import { PerformanceTabId } from "metabase/admin/performance/types";
import { getPerformanceTabName } from "metabase/admin/performance/utils";

export const DashboardAndQuestionCachingTab = () => {
  return (
    <Tab
      key="DashboardAndQuestionCaching"
      value={PerformanceTabId.DashboardsAndQuestions}
    >
      {getPerformanceTabName(PerformanceTabId.DashboardsAndQuestions)}
    </Tab>
  );
};
