import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
