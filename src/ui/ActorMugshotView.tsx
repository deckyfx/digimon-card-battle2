import "./actor-mugshot-view.css";

export type MugshotAnimation = "spin" | "scale" | "move";

/**
 * Framed actor mugshot — the character face inside a gold TV-style frame.
 * Supports optional looping animations: spin, scale, move (float).
 *
 * @param mugshot  Path to the mugshot image (e.g. actor.mugshot)
 * @param size     Pixel multiplier for the 78×69 base frame. Default: 3 → 234×207px.
 * @param animation  Optional looping CSS animation applied to the whole component.
 * @param label    Accessible alt text.
 */
export function ActorMugshotView(props: {
  mugshot: string;
  /** Fixed pixel multiplier of the 78×69 base frame (default 3 → 234×207px). */
  size?: number;
  /** Fill parent container instead of using a fixed pixel size. Parent must be position:relative with explicit dimensions. */
  fill?: boolean;
  animation?: MugshotAnimation;
  label?: string;
}) {
  const scale = () => props.size ?? 3;
  const w = () => `${scale() * 78}px`;
  const h = () => `${scale() * 69}px`;

  return (
    <div
      class="amv-root"
      classList={{
        "amv-root--fill": !!props.fill,
        [`amv-anim-${props.animation}`]: !!props.animation,
      }}
      style={props.fill ? undefined : { width: w(), height: h() }}
    >
      {/* Frame first (behind), mugshot second (on top) so it covers the opaque black screen area */}
      <img class="amv-frame" src="/assets/mugshots/frame.png" alt="" />
      <img class="amv-mugshot" src={props.mugshot} alt={props.label ?? ""} />
    </div>
  );
}
