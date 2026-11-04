import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

export interface PlotCubeProps {
  /** Exactly six faces, ordered front, right, back, left, top, bottom. */
  faces: ReactNode[];
  /** Labels shown above each face. */
  labels?: string[];
}

const FACE_ROTATIONS = [
  'rotateY(0deg)',
  'rotateY(90deg)',
  'rotateY(180deg)',
  'rotateY(-90deg)',
  'rotateX(90deg)',
  'rotateX(-90deg)',
];

const FACE_NAMES = ['front', 'right', 'back', 'left', 'top', 'bottom'];

/** Fraction of the smaller viewport dimension the cube takes up. */
const CUBE_SCALE = 0.58;

const EXPLODE_SCALE = 1.4;

/** How far an exploded cube moves away from the viewer, as a multiple of its size. */
const EXPLODE_PUSH = 1.8;

/** Fraction of the remaining push distance covered per millisecond, roughly matching the face transition. */
const PUSH_EASING_PER_MS = 0.008;

const DRAG_DEGREES_PER_PIXEL = 0.4;

const KEY_STEP_DEGREES = 15;

const AUTO_ROTATE_DEGREES_PER_MS = 0.012;

/** Velocity retained per millisecond once a fling is released. */
const FRICTION_PER_MS = 0.996;

/** A drag that pauses longer than this before release does not fling. */
const FLING_WINDOW_MS = 80;

const INITIAL_ROTATION = { x: -22, y: -32 };

interface Motion {
  /** Rotation in degrees. */
  x: number;
  y: number;
  /** Fling velocity in degrees per millisecond. */
  vx: number;
  vy: number;
  /** Distance the cube is pushed away from the viewer, in pixels. */
  push: number;
  drag?: { clientX: number; clientY: number; time: number };
}

function wrapDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function clampTilt(degrees: number): number {
  // Past vertical, horizontal drags would spin the cube the opposite way
  return Math.max(-90, Math.min(90, degrees));
}

/**
 * Lays its children out on the faces of a CSS 3D cube that can be flung
 * around with the pointer or turned with the arrow keys.
 *
 * Rotation runs in its own animation loop and writes the transform directly,
 * so spinning the cube never re-renders the plots on it.
 */
export function PlotCube({ faces, labels }: PlotCubeProps): JSX.Element {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<Motion>({
    ...INITIAL_ROTATION,
    vx: 0,
    vy: 0,
    push: 0,
  });
  const [size, setSize] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isExploded, setIsExploded] = useState(false);

  const isAutoRotatingRef = useRef(isAutoRotating);
  isAutoRotatingRef.current = isAutoRotating;

  const depth = (size / 2) * (isExploded ? EXPLODE_SCALE : 1);
  // Exploded faces spread well past the cube's footprint, so the whole cube
  // backs away to keep them in view
  const pushTargetRef = useRef(0);
  pushTargetRef.current = isExploded ? size * EXPLODE_PUSH : 0;

  useEffect(function observeSceneSize() {
    const scene = sceneRef.current;
    if (scene == null) {
      return undefined;
    }
    const applySize = (): void => {
      setSize(
        Math.floor(Math.min(scene.clientWidth, scene.clientHeight) * CUBE_SCALE)
      );
    };
    applySize();
    const observer = new ResizeObserver(applySize);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(function animate() {
    let frame = 0;
    let last = performance.now();
    const step = (now: number): void => {
      // Clamp so a backgrounded tab does not jump on return
      const elapsed = Math.min(64, now - last);
      last = now;
      const motion = motionRef.current;
      if (motion.drag == null) {
        motion.x = clampTilt(motion.x + motion.vx * elapsed);
        motion.y += motion.vy * elapsed;
        const decay = FRICTION_PER_MS ** elapsed;
        motion.vx = Math.abs(motion.vx) < 1e-4 ? 0 : motion.vx * decay;
        motion.vy = Math.abs(motion.vy) < 1e-4 ? 0 : motion.vy * decay;
        if (isAutoRotatingRef.current) {
          motion.y += AUTO_ROTATE_DEGREES_PER_MS * elapsed;
        }
      }
      motion.y = wrapDegrees(motion.y);
      motion.push +=
        (pushTargetRef.current - motion.push) *
        Math.min(1, PUSH_EASING_PER_MS * elapsed);
      const cube = cubeRef.current;
      if (cube != null) {
        cube.style.transform = `translateZ(${-motion.push}px) rotateX(${
          motion.x
        }deg) rotateY(${motion.y}deg)`;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const motion = motionRef.current;
    motion.vx = 0;
    motion.vy = 0;
    motion.drag = {
      clientX: event.clientX,
      clientY: event.clientY,
      time: event.timeStamp,
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const motion = motionRef.current;
    const { drag } = motion;
    if (drag == null) {
      return;
    }
    const dx = (event.clientX - drag.clientX) * DRAG_DEGREES_PER_PIXEL;
    const dy = -(event.clientY - drag.clientY) * DRAG_DEGREES_PER_PIXEL;
    const elapsed = Math.max(1, event.timeStamp - drag.time);
    motion.x = clampTilt(motion.x + dy);
    motion.y += dx;
    motion.vx = dy / elapsed;
    motion.vy = dx / elapsed;
    motion.drag = {
      clientX: event.clientX,
      clientY: event.clientY,
      time: event.timeStamp,
    };
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const motion = motionRef.current;
    if (
      motion.drag != null &&
      event.timeStamp - motion.drag.time > FLING_WINDOW_MS
    ) {
      motion.vx = 0;
      motion.vy = 0;
    }
    motion.drag = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const motion = motionRef.current;
    switch (event.key) {
      case 'ArrowLeft':
        motion.y -= KEY_STEP_DEGREES;
        break;
      case 'ArrowRight':
        motion.y += KEY_STEP_DEGREES;
        break;
      case 'ArrowUp':
        motion.x = clampTilt(motion.x + KEY_STEP_DEGREES);
        break;
      case 'ArrowDown':
        motion.x = clampTilt(motion.x - KEY_STEP_DEGREES);
        break;
      default:
        return;
    }
    event.preventDefault();
    motion.vx = 0;
    motion.vy = 0;
  }, []);

  const handleReset = useCallback(() => {
    motionRef.current = {
      ...motionRef.current,
      ...INITIAL_ROTATION,
      vx: 0,
      vy: 0,
    };
  }, []);

  return (
    <div className="plot-cube">
      <div
        ref={sceneRef}
        className="plot-cube-scene"
        data-testid="plot-cube"
        role="group"
        aria-roledescription="rotatable cube"
        aria-label="Plot cube. Drag or use the arrow keys to rotate."
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        style={{ perspective: `${Math.max(1, size) * 3.2}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={cubeRef}
          className="plot-cube-body"
          style={{ width: size, height: size }}
        >
          {faces.map((face, index) => (
            <div
              key={FACE_NAMES[index]}
              className="plot-cube-face"
              data-face={FACE_NAMES[index]}
              style={{
                transform: `${FACE_ROTATIONS[index]} translateZ(${depth}px)`,
              }}
            >
              {labels?.[index] != null && (
                <div className="plot-cube-face-label">{labels[index]}</div>
              )}
              <div className="plot-cube-face-plot">{face}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="plot-cube-toolbar">
        <label className="plot-demo-checkbox" htmlFor="cube-auto-rotate">
          <input
            id="cube-auto-rotate"
            type="checkbox"
            data-testid="cube-auto-rotate"
            checked={isAutoRotating}
            onChange={event => setIsAutoRotating(event.target.checked)}
          />
          Auto rotate
        </label>
        <label className="plot-demo-checkbox" htmlFor="cube-explode">
          <input
            id="cube-explode"
            type="checkbox"
            data-testid="cube-explode"
            checked={isExploded}
            onChange={event => setIsExploded(event.target.checked)}
          />
          Explode
        </label>
        <button
          type="button"
          className="plot-cube-reset"
          data-testid="cube-reset"
          onClick={handleReset}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}

export default PlotCube;
