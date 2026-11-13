'use client';

import { SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/lib/query';
import { cn } from '@/lib/utils';

type InventorySearchProps = {
  query: string;
  placeholder: string;
  className?: string;
};

/** Writes the search to the URL (?q=), keeping other filters and resetting the page. */
export function InventorySearch(props: InventorySearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(props.query);
  const debounced = useDebouncedValue(value.trim(), 300);

  useEffect(() => {
    if (debounced === props.query) return;

    const params = new URLSearchParams(searchParams);

    params.delete('page');

    if (debounced) params.set('q', debounced);
    else params.delete('q');

    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname);
  }, [debounced, props.query, pathname, router, searchParams]);

  return (
    <div className={cn('relative w-full max-w-xs', props.className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        enterKeyHint="search"
        aria-label={props.placeholder}
        placeholder={props.placeholder}
        className="pl-11"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}

type InventorySearchSkeletonProps = {
  placeholder: string;
  className?: string;
};

/** The same search box, inert, for loading screens: it takes the real box's place and size exactly. */
export function InventorySearchSkeleton(props: InventorySearchSkeletonProps) {
  return (
    <div aria-hidden className={cn('relative w-full max-w-xs', props.className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input readOnly tabIndex={-1} placeholder={props.placeholder} className="pl-11" />
    </div>
  );
}
