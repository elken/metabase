import { t } from "ttag";

import { useCreateChannelMutation } from "metabase/api/channel";
import { Modal } from "metabase/ui";

import {
  handleFieldError,
  WebhookForm,
  type WebhookFormProps,
} from "./WebhookForm";

interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialValues = {
  url: "",
  name: "",
  description: "",
  "auth-method": "none" as const,
  "auth-info": { "": "" },
};

export const CreateWebhookModal = ({
  isOpen,
  onClose,
}: CreateWebhookModalProps) => {
  const [createChannel] = useCreateChannelMutation();
  const handleSubmit = async (vals: WebhookFormProps) => {
    return createChannel({
      name: vals.name,
      type: "channel/http",
      description: vals.description,
      details: {
        url: vals.url,
        "auth-method": vals["auth-method"],
        "auth-info": vals["auth-info"],
      },
    })
      .unwrap()
      .then(() => {
        onClose();
      })
      .catch(e => {
        handleFieldError(e);
        throw e;
      });
  };

  return (
    <Modal.Root opened={isOpen} onClose={onClose} size="36rem">
      <Modal.Overlay />
      <Modal.Content p="1rem">
        <Modal.Header mb="1.5rem">
          <Modal.Title>{t`New alert webhook`}</Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          <WebhookForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            initialValues={initialValues}
          />
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};