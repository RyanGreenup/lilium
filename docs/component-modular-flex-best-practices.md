
# Flex Layout Best Practices (SolidJS + Tailwind)

## 1. Flex children should be visible at the call site

```tsx
// Good — layout is scannable
<div class="h-full flex flex-col">
  <Header />   {/* shrink-0 */}
  <Divider />  {/* shrink-0 */}
  <Content />  {/* flex-1 */}
</div>

// Bad — fragment hides flex children behind indirection
<div class="h-full flex flex-col">
  <PageContent /> {/* returns <>...</> with 3 flex children */}
</div>
```

## 2. Own your flex behavior in your root element

Each component should declare how it participates in the parent flex context on its own root element:

```tsx
// The component owns its shrink-0
const Header: Component = () => (
  <div class="p-4 shrink-0">...</div>
)

// The component owns its flex-1
const Content: Component = () => (
  <div class="flex-1 min-h-0 overflow-auto">...</div>
)
```

## 3. Name components after their layout role when possible

`Header`, `Sidebar`, `StatusBadge` are better than `TopSection`, `LeftPart`, `Thing` — the name should hint at the flex behavior.

## 4. Comment the flex role at the call site

```tsx
<Avatar />        {/* shrink-0 */}
<PersonSummary /> {/* flex-1 min-w-0 */}
<RoleInfo />      {/* flex-1 min-w-0, hidden md:block */}
<StatusBadge />   {/* shrink-0 */}
```

## 5. Extract row-level helpers as prop-driven components, not closures

```tsx
// Good — props make data flow explicit, reusable, testable
<Avatar src={person.avatar} alt={person.name} selected={isSelected()} />

// Avoid — closure captures are implicit, not reusable
const Avatar: Component = () => (
  <div>
    <img src={person.avatar} /> {/* where does person come from? */}
  </div>
)
```

## 6. Use the right component type

| Type | Children | Use case |
|---|---|---|
| `Component<P>` | none | Leaf nodes (`Avatar`, `StatusBadge`) |
| `ParentComponent<P>` | `JSX.Element` | Wrappers (`Card`, `Modal`) |
| `FlowComponent<P, T>` | `(arg: T) => JSX.Element` | Render callbacks (`<For>`, `<Show>`) |
| Explicit function | custom | Generics or multi-arg children (`VirtualList<T>`) |

## 7. Keep render callbacks thin

The callback in `<VirtualList>` should be pure composition of named components — logic like `rowBg()` is fine, but avoid deep nesting:

```tsx
// Good
{(person, virtualRow, isSelected) => {
  const rowBg = () => { ... }
  return (
    <div class={`... ${rowBg()}`}>
      <Avatar ... />
      <PersonSummary ... />
      <RoleInfo ... />
      <StatusBadge ... />
    </div>
  )
}}
```
