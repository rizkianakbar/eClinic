import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

/*
 * Press feedback on pointer-down (scale 0.97); hover only where a real
 * pointer exists (Tailwind v4 gates hover: by capability).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/20 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(10_60_45/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-[#13644f]',
        outline:
          'border-border bg-card text-foreground shadow-[0_1px_2px_rgb(20_32_29/0.05)] hover:bg-muted aria-expanded:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[#dcebe5] aria-expanded:bg-[#dcebe5]',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
        destructive: 'bg-destructive text-white hover:bg-[#9a3126] focus-visible:ring-destructive/25',
        'destructive-outline': 'border-destructive/40 bg-card text-destructive hover:bg-status-cancelled-soft',
        link: 'h-auto px-0 text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary',
      },
      size: {
        // pointer-coarse: one notch bigger on touchscreens, so fingers hit what the mouse layout keeps compact.
        default: 'h-9 px-3.5 pointer-coarse:h-10',
        sm: 'h-8 gap-1.5 px-3 text-[0.8125rem] pointer-coarse:h-9',
        lg: 'h-11 px-5 text-[0.9375rem]',
        xs: 'h-7 gap-1 rounded-md px-2 text-xs pointer-coarse:h-9 pointer-coarse:px-2.5',
        icon: 'size-9 pointer-coarse:size-10',
        'icon-sm': 'size-8 pointer-coarse:size-9',
        'icon-xs': 'size-7 rounded-md pointer-coarse:size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
