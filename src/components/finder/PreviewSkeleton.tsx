interface PreviewSkeletonProps {
  mode?: "panel" | "content";
}

function SkeletonBody() {
  return (
    <div class="p-4 h-full flex flex-col gap-4 min-h-0">
      <div class="space-y-2">
        <div class="skeleton h-6 w-2/3 rounded-md" />
        <div class="skeleton h-4 w-24 rounded-full" />
      </div>

      <div class="space-y-2">
        <div class="skeleton h-3 w-20 rounded-md" />
        <div class="skeleton h-3 w-full rounded-md" />
        <div class="skeleton h-3 w-5/6 rounded-md" />
        <div class="skeleton h-3 w-2/3 rounded-md" />
      </div>

      <div class="space-y-2">
        <div class="skeleton h-3 w-28 rounded-md" />
        <div class="skeleton h-3 w-40 rounded-md" />
      </div>

      <div class="flex-1 min-h-0 rounded border border-base-300 bg-base-200/30 p-4 space-y-2">
        <div class="skeleton h-3 w-24 rounded-md" />
        <div class="skeleton h-3 w-full rounded-md" />
        <div class="skeleton h-3 w-full rounded-md" />
        <div class="skeleton h-3 w-4/5 rounded-md" />
        <div class="skeleton h-3 w-11/12 rounded-md" />
      </div>

      <div class="skeleton h-8 w-full rounded-md" />
    </div>
  );
}

function ContentSkeletonBody() {
  return (
    <div class="p-4 h-full space-y-2">
      <div class="skeleton h-3 w-24 rounded-md" />
      <div class="skeleton h-3 w-full rounded-md" />
      <div class="skeleton h-3 w-full rounded-md" />
      <div class="skeleton h-3 w-4/5 rounded-md" />
      <div class="skeleton h-3 w-11/12 rounded-md" />
      <div class="skeleton h-3 w-3/4 rounded-md" />
    </div>
  );
}

export default function PreviewSkeleton(props: PreviewSkeletonProps) {
  if (props.mode === "content") return <ContentSkeletonBody />;

  return (
    <div class="bg-base-100 overflow-hidden relative z-0 isolate flex flex-col h-full">
      <div class="px-3 py-1.5 text-xs font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300">
        Preview
      </div>
      <div class="flex-1 min-h-0 overflow-hidden">
        <SkeletonBody />
      </div>
    </div>
  );
}
