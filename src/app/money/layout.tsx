// The Money workspace: its own colours and page surface (see "Workspace
// themes" in globals.css), under its own header.
export default function MoneyLayout({ children }: LayoutProps<"/money">) {
  return (
    // Pulled up under the see-through header, so it shows this surface too.
    <div data-workspace="money" className="workspace-surface -mt-16 flex flex-1 flex-col pt-16">
      {children}
    </div>
  );
}
