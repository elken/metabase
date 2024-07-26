import { useState } from "react";
import { useSetting } from "metabase/common/hooks";
import { SharingMenu } from "./SharingMenu";
import Question from "metabase-lib/v1/Question";
import { getUserIsAdmin } from "metabase/selectors/user";
import { useSelector } from "metabase/lib/redux";
import { EmbedMenu } from "metabase/dashboard/components/EmbedMenu";
import QuestionAlertWidget from "metabase/query_builder/components/view/QuestionAlertWidget";
import { Menu } from "@mantine/core";
import CS from "metabase/css/index.css";
import cx from "classnames";

export function QuestionSharingMenu({ question }: { question: Question }) {

  if (!question?.isSaved()) {
    return null;
  }

  const isPublicSharingEnabed = useSetting("enable-public-sharing");
  const isEmbeddingEnabled = useSetting("enable-embedding");
  const isAdmin = useSelector(getUserIsAdmin);
  const canManageSubscriptions = useSelector(state => state.currentUser?.is_superuser);

  const hasPublicLink = !!question.publicUUID();

  return (
    <SharingMenu>
      <EmbedMenu
        resource={question}
        resourceType="question"
        hasPublicLink={hasPublicLink}
        onModalOpen={() => {}}
      />
      <QuestionAlertWidget
        key="alerts"
        className={cx(CS.hide, CS.smShow)}
        canManageSubscriptions={canManageSubscriptions}
        question={question}
        // questionAlerts={questionAlerts}
        // onCreateAlert={() => {}
        //   // question.isSaved()
        //   //   ? onOpenModal("create-alert")
        //   //   : onOpenModal("save-question-before-alert")
        // }
      />
    </SharingMenu>
  );
}