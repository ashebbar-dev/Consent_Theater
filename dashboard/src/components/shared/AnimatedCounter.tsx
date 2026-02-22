import { useEffect, useRef, CSSProperties } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    decimals?: number;
    style?: CSSProperties;
}

export default function AnimatedCounter({
    value,
    duration = 1.5,
    prefix = '',
    suffix = '',
    className = '',
    decimals = 0,
    style,
}: AnimatedCounterProps) {
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, (latest) =>
        decimals > 0
            ? latest.toFixed(decimals)
            : Math.round(latest).toLocaleString('en-IN')
    );
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const controls = animate(motionValue, value, {
            duration,
            ease: 'easeOut',
        });
        return controls.stop;
    }, [value, duration, motionValue]);

    return (
        <span className={className} style={style}>
            {prefix}
            <motion.span ref={ref}>{rounded}</motion.span>
            {suffix}
        </span>
    );
}
