import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";

/** One card in the stack */
export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={[
      "absolute top-1/2 left-1/2",
      "[transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden]",
      customClass ?? "",
      rest.className ?? "",
    ].join(" ")}
  />
));
Card.displayName = "Card";

/** Get horizontal carousel positions */
const getCarouselPosition = (index, total, cardWidth = 320) => {
  const spacing = cardWidth * 0.15; // 15% overlap - closer cards
  const centerOffset = (total - 1) * spacing / 2;
  
  return {
    x: (index * spacing) - centerOffset,
    y: 0,
    z: -index * 20, // Slight depth
    zIndex: total - index,
  };
};

/** Get card size and scale based on position */
const getCardScale = (index, total) => {
  // Front card (index 0) is largest, others are smaller
  if (index === 0) return 1.0;      // Front: 100%
  if (index === 1) return 0.85;     // Second: 85%
  return 0.7;                       // Back: 70%
};

const placeCard = (el, position, scale) =>
  gsap.set(el, {
    x: position.x,
    y: position.y,
    z: position.z,
    xPercent: -50,
    yPercent: -50,
    scale: scale,
    transformOrigin: "center center",
    zIndex: position.zIndex,
    force3D: true,
  });

const CardSwap = ({
  width = 320,
  height = 200,
  delay = 3000,
  pauseOnHover = true,
  onCardClick,
  easing = "power2.inOut",
  anchorRight = true,
  children,
}) => {
  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    [childArr.length]
  );

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));
  const tlRef = useRef(null);
  const intervalRef = useRef();
  const container = useRef(null);

  useEffect(() => {
    const total = refs.length;
    if (total < 2) return;

    // Initial positions - horizontal carousel
    refs.forEach((r, i) => {
      const position = getCarouselPosition(i, total, width);
      const scale = getCardScale(i, total);
      placeCard(r.current, position, scale);
    });

    const rotate = () => {
      if (order.current.length < 2) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Move all cards to their new positions
      refs.forEach((r, i) => {
        const currentOrderIndex = order.current.indexOf(i);
        const newOrderIndex = (currentOrderIndex + 1) % total;
        const newPosition = getCarouselPosition(newOrderIndex, total, width);
        const newScale = getCardScale(newOrderIndex, total);
        
        tl.to(
          r.current,
          {
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z,
            scale: newScale,
            zIndex: newPosition.zIndex,
            duration: 1.5,
            ease: easing,
          },
          i * 0.1 // Slight stagger
        );
      });

      // Update order
      tl.call(() => {
        order.current = [...order.current.slice(1), order.current[0]];
      });
    };

    rotate();
    intervalRef.current = window.setInterval(rotate, delay);

    if (pauseOnHover) {
      const containerEl = container.current;
      if (containerEl) {
        const pause = () => {
          console.log("Pausing animation");
          if (tlRef.current) tlRef.current.pause();
          clearInterval(intervalRef.current);
        };
        const resume = () => {
          console.log("Resuming animation");
          if (tlRef.current) tlRef.current.resume();
          intervalRef.current = window.setInterval(rotate, delay);
        };

        containerEl.addEventListener("mouseenter", pause);
        containerEl.addEventListener("mouseleave", resume);

        return () => {
          containerEl.removeEventListener("mouseenter", pause);
          containerEl.removeEventListener("mouseleave", resume);
        };
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    delay,
    pauseOnHover,
    easing,
    width,
    height,
  ]);

  // Render cards with proper dimensions
  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...child.props?.style },
          onClick: (e) => {
            child.props?.onClick?.(e);
            onCardClick?.(i);
          },
        })
      : child
  );

  return (
    <div
      ref={container}
      className={
        anchorRight
          ? "absolute bottom-0 right-0 translate-x-[16%] translate-y-[24%] origin-bottom-right perspective-[1400px] overflow-visible max-[768px]:translate-x-[25%] max-[768px]:translate-y-[25%] max-[768px]:scale-[0.75] max-[480px]:translate-x-[25%] max-[480px]:translate-y-[25%] max-[480px]:scale-[0.55]"
          : "relative w-full h-full flex items-center justify-center perspective-[1400px] overflow-visible group"
      }
      style={{ width: width * 1.5, height: height * 1.0 }} // Container for horizontal layout
    >
      {rendered}
    </div>
  );
};

export default CardSwap;