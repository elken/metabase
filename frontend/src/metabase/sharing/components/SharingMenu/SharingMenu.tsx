import { Menu, Button, Title, Text, Stack, Center, Icon } from "metabase/ui";
import { t } from "ttag";
import { ToolbarButton } from "metabase/common/components/ToolbarButton";

export function SharingMenu({ children }: { children: React.ReactNode }) {
  return (
    <Menu withinPortal>
      <Menu.Target>
        <ToolbarButton
          icon="share"
          tooltipLabel={t`Sharing`}
          aria-label={t`Sharing`}
        />
      </Menu.Target>
      <Menu.Dropdown>
        {children}
      </Menu.Dropdown>
    </Menu>
  )
}
