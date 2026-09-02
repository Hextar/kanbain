import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheckCircle2, CircleAlert, Columns3, Plus } from "lucide-react";
import AppHeader, { HeaderProvider, HeaderSlot } from "./AppHeader";
import Avatar, { AvatarStack } from "./Avatar";
import Badge from "./Badge";
import Button from "./Button";
import ButtonGroup, { ButtonGroupItem } from "./ButtonGroup";
import Callout from "./Callout";
import CanvasDots from "./CanvasDots";
import Card from "./Card";
import Chip from "./Chip";
import CollapsibleSlot from "./CollapsibleSlot";
import ColorSwatch from "./ColorSwatch";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu from "./ContextMenu";
import Dialog, { DialogPanel } from "./Dialog";
import EmptyState from "./EmptyState";
import Field, { FormMessage } from "./Field";
import HoverPreview from "./HoverPreview";
import IconButton from "./IconButton";
import Input from "./Input";
import LightOrb from "./LightOrb";
import PopoverPanel, { Popover } from "./PopoverPanel";
import ProgressBar from "./ProgressBar";
import ProgressRing from "./ProgressRing";
import RadioButton from "./RadioButton";
import Select from "./Select";
import Skeleton from "./Skeleton";
import Textarea from "./Textarea";
import ToastHost from "./ToastHost";
import Tooltip from "./Tooltip";
import { showToast } from "@libraries/toast";

const meta = {
  title: "Overview",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function OverviewGallery() {
  const [view, setView] = useState("board");
  const [effort, setEffort] = useState("medium");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [swatch, setSwatch] = useState("violet");
  const [collapsed, setCollapsed] = useState(true);
  const [chipVisible, setChipVisible] = useState(true);

  return (
    <CanvasDots className="min-h-screen">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-purple-300 uppercase">
            uiKit
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Every primitive in the kit, on one page. Open a sidebar story for
            controls and extra states.
          </p>
        </div>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button">Save</Button>
            <Button kind="outline" type="button" variant="secondary">
              Cancel
            </Button>
            <Button kind="ghost" type="button" variant="secondary">
              Skip
            </Button>
            <Button type="button" variant="danger">
              Delete
            </Button>
            <IconButton aria-label="Add" type="button" variant="secondary">
              <Plus size={16} />
            </IconButton>
          </div>
        </Section>

        <Section title="Button group">
          <div className="flex flex-wrap items-center gap-4">
            <ButtonGroup aria-label="Board view" role="tablist">
              {["board", "flow"].map((id) => (
                <ButtonGroupItem
                  key={id}
                  grow={false}
                  role="tab"
                  selected={view === id}
                  size="xs"
                  onClick={() => setView(id)}
                >
                  {id === "board" ? "Board" : "Flow"}
                </ButtonGroupItem>
              ))}
            </ButtonGroup>
            <ButtonGroup size="sm">
              {["low", "medium", "high"].map((id) => (
                <ButtonGroupItem
                  key={id}
                  selected={effort === id}
                  tone="primary"
                  onClick={() => setEffort(id)}
                >
                  {id}
                </ButtonGroupItem>
              ))}
            </ButtonGroup>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-lg gap-3">
            <Field htmlFor="overview-title" label="Title">
              <Input id="overview-title" placeholder="KanbAIn" />
            </Field>
            <Field htmlFor="overview-milestone" label="Milestone">
              <Select aria-label="Milestone" id="overview-milestone">
                <option value="">None</option>
                <option value="m1">M1 Launch</option>
              </Select>
            </Field>
            <Field align="start" htmlFor="overview-goal" label="Notes">
              <Textarea
                id="overview-goal"
                placeholder="What are you building?"
              />
            </Field>
            <div className="flex gap-2">
              <RadioButton name="overview-view" selected>
                Board
              </RadioButton>
              <RadioButton kind="outline" name="overview-view">
                Flow
              </RadioButton>
            </div>
            <FormMessage>Could not save the key.</FormMessage>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-rose-500/15 text-rose-300 uppercase">
              high
            </Badge>
            <Badge tone="muted">Kanban</Badge>
            <Badge tone="danger">Failed</Badge>
            <Badge className="bg-zinc-800 text-zinc-300" tone="count">
              12
            </Badge>
            {chipVisible ? (
              <Chip
                removeLabel="Remove filter"
                onRemove={() => setChipVisible(false)}
              >
                Assignee is Ada
              </Chip>
            ) : (
              <Button
                kind="ghost"
                size="xs"
                type="button"
                variant="secondary"
                onClick={() => setChipVisible(true)}
              >
                Restore chip
              </Button>
            )}
          </div>
        </Section>

        <Section title="Surfaces">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <p className="text-[11px] text-zinc-500">KBN-12</p>
              <p className="mt-1 text-sm font-semibold text-white">
                Ship the board filters
              </p>
            </Card>
            <Card className="relative overflow-hidden pt-4" size="md">
              <ProgressBar
                label="Tasks completed"
                percent={70}
                trackClassName="bg-white/10"
                variant="flush"
              />
              <p className="text-lg font-semibold text-white">KanbAIn</p>
              <p className="mt-1 text-sm text-zinc-400">
                Plan and track the board.
              </p>
            </Card>
          </div>
        </Section>

        <Section title="Feedback">
          <div className="flex flex-col gap-3">
            <Callout
              body="This key ends in 9f2a."
              icon={<CheckCircle2 size={16} />}
              title="An API key is already saved"
              tone="ok"
            />
            <Callout
              body="Paste a key below to generate a board."
              icon={<CircleAlert size={16} />}
              title="An OpenAI API key is required"
              tone="warn"
            />
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <ProgressRing completed={3} total={12} />
              3/12 completed
              <div className="w-40">
                <ProgressBar label="Planning" percent={42} />
              </div>
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        </Section>

        <Section title="Empty">
          <EmptyState
            action={
              <Button size="sm" type="button">
                New project
              </Button>
            }
            body="Add a title and a short description."
            icon={<Columns3 aria-hidden size={28} />}
            size="page"
            title="No projects yet"
          />
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => setDialogOpen(true)}>
              Dialog
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmOpen(true)}
            >
              Confirm
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => showToast("Couldn't retry planning.")}
            >
              Toast
            </Button>
            <Tooltip content="Priority: High">
              <Button kind="ghost" size="xs" type="button" variant="secondary">
                Tooltip
              </Button>
            </Tooltip>
            <HoverPreview
              content={
                <Card className="w-52" size="sm">
                  <p className="text-sm font-semibold text-white">
                    Ship filters
                  </p>
                </Card>
              }
            >
              <span className="text-sm text-zinc-300 underline decoration-zinc-600">
                Hover preview
              </span>
            </HoverPreview>
            <ContextMenu
              items={[
                { id: "rename", label: "Rename" },
                { type: "separator" },
                { id: "delete", label: "Delete", danger: true },
              ]}
              label="Card actions"
            >
              <Button kind="outline" type="button" variant="secondary">
                Right-click
              </Button>
            </ContextMenu>
            <Popover open={popoverOpen} onClose={() => setPopoverOpen(false)}>
              <Button
                kind="outline"
                size="xs"
                type="button"
                variant="secondary"
                onClick={() => setPopoverOpen((current) => !current)}
              >
                Popover
              </Button>
              {popoverOpen ? (
                <PopoverPanel className="w-56 p-3" role="dialog">
                  <p className="relative text-sm text-zinc-300">
                    Assignee, priority, title…
                  </p>
                </PopoverPanel>
              ) : null}
            </Popover>
          </div>
        </Section>

        <Section title="Avatars and color">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              className="bg-violet-500/30 text-violet-100"
              initials="KA"
              size="md"
            />
            <AvatarStack extra={2}>
              <Avatar
                className="bg-sky-500/30 text-sky-100 ring-2 ring-[#181b24]"
                initials="AL"
              />
              <Avatar
                className="-ml-1.5 bg-amber-500/30 text-amber-100 ring-2 ring-[#181b24]"
                initials="BN"
              />
            </AvatarStack>
            <div className="grid grid-cols-5 gap-1.5" role="listbox">
              {[
                { id: "violet", className: "bg-violet-400" },
                { id: "sky", className: "bg-sky-400" },
                { id: "amber", className: "bg-amber-400" },
                { id: "rose", className: "bg-rose-400" },
                { id: "emerald", className: "bg-emerald-400" },
              ].map((item) => (
                <ColorSwatch
                  key={item.id}
                  colorClassName={item.className}
                  label={item.id}
                  selected={swatch === item.id}
                  onClick={() => setSwatch(item.id)}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title="Motion">
          <Button
            kind="outline"
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <CollapsibleSlot present={!collapsed}>
            <p className="pt-2 text-sm text-zinc-400">
              Nested cards sit in this slot.
            </p>
          </CollapsibleSlot>
        </Section>

        <Section title="Chrome">
          <HeaderProvider>
            <div className="overflow-hidden rounded-xl border border-white/8">
              <AppHeader projectName="KanbAIn" />
              <HeaderSlot
                center={<span className="text-xs text-zinc-400">Board</span>}
              >
                <span className="text-xs text-zinc-500">3/12 completed</span>
              </HeaderSlot>
            </div>
          </HeaderProvider>
          <div className="relative h-24 overflow-hidden rounded-xl border border-white/8 bg-[#181b24]">
            <LightOrb />
          </div>
        </Section>
      </div>

      <Dialog
        eyebrow="Workspace"
        footer={
          <div className="flex justify-end">
            <Button
              size="sm"
              type="button"
              onClick={() => setDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        }
        open={dialogOpen}
        title="Settings"
        onClose={() => setDialogOpen(false)}
      >
        <DialogPanel title="API key">
          <p className="text-sm text-zinc-400">
            The key is encrypted on the server and never shown in full.
          </p>
        </DialogPanel>
      </Dialog>
      <ConfirmDialog
        confirmLabel="Delete card"
        description="This will permanently delete this card."
        open={confirmOpen}
        title="Delete this card?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
      />
      <ToastHost />
    </CanvasDots>
  );
}

export const Gallery: Story = {
  name: "Gallery",
  render: () => <OverviewGallery />,
};
