import { cn } from '@/lib/utils';

interface LocaleOption {
    code: string;
    label: string;
}

interface LocaleTabsProps {
    locales: LocaleOption[];
    active: string;
    onChange: (locale: string) => void;
    className?: string;
}

export default function LocaleTabs({
    locales,
    active,
    onChange,
    className,
}: LocaleTabsProps) {
    return (
        <div
            className={cn(
                'inline-flex flex-wrap gap-2 rounded-xl border bg-muted/40 p-1',
                className,
            )}
        >
            {locales.map((locale) => (
                <button
                    key={locale.code}
                    type="button"
                    onClick={() => onChange(locale.code)}
                    className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active === locale.code
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
                    )}
                >
                    <span className="mr-2 text-xs uppercase tracking-[0.24em]">
                        {locale.code}
                    </span>
                    {locale.label}
                </button>
            ))}
        </div>
    );
}
