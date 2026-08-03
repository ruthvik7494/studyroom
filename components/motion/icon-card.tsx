'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { StaggerItem } from './stagger';
import { EASE_OUT, DURATION } from '@/lib/motion';

interface IconCardProps {
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
}

/**
 * Feature/benefit card (icon badge + title + body). Must be rendered inside
 * a <StaggerGroup> — it's already a <StaggerItem> internally. On hover, the
 * icon rotates slightly and the card border tints toward the brand color;
 * everything else about the card (padding, colors, copy) is untouched.
 */
export function IconCard({ icon, title, body }: IconCardProps) {
  return (
    <StaggerItem className="h-full">
      <motion.div initial="rest" whileHover="hover" animate="rest" className="h-full">
        <Card className="h-full p-5 transition-colors duration-300 hover:border-primary/40">
          <motion.span
            variants={{ rest: { rotate: 0 }, hover: { rotate: -8 } }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary"
            aria-hidden
          >
            {icon}
          </motion.span>
          <p className="mt-3 font-display font-bold">{title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        </Card>
      </motion.div>
    </StaggerItem>
  );
}
