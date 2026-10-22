"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PRICING_TIERS,
  DEFAULT_AVG_TRANSACTION,
  DEFAULT_VOLUME,
  MIN_VOLUME,
  MAX_VOLUME,
  DEFAULT_COMPARISON_FEES,
  clampVolume,
  estimateMonthlyCost,
  formatUsd,
  formatUsdCompact,
  recommendTier,
  sliderToVolume,
  volumeToSlider,
} from '@/lib/pricing';

const AVG_TRANSACTION_OPTIONS = [10, 25, 50, 100, 250, 500];

export function VolumeCalculator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialVolume = clampVolume(Number(searchParams?.get('volume')) || DEFAULT_VOLUME);
  const { register, control, setValue, formState: { errors } } = useForm<{
    volume: number;
    competitorPercent: number;
    competitorFixed: number;
  }>({
    mode: 'onChange',
    defaultValues: {
      volume: initialVolume,
      competitorPercent: DEFAULT_COMPARISON_FEES.percentFee,
      competitorFixed: DEFAULT_COMPARISON_FEES.fixedFee,
    },
  });
  const rawVolume = useWatch({ control, name: 'volume' });
  const competitorPercent = useWatch({ control, name: 'competitorPercent' });
  const competitorFixed = useWatch({ control, name: 'competitorFixed' });
  const volumeValid = Number.isFinite(rawVolume) && rawVolume >= MIN_VOLUME && rawVolume <= MAX_VOLUME;
  const volume = volumeValid ? rawVolume : initialVolume;
  const comparisonValid = Number.isFinite(competitorPercent) && competitorPercent >= 0 && competitorPercent <= 100
    && Number.isFinite(competitorFixed) && competitorFixed >= 0;
  const setVolume = (value: number) => setValue('volume', value, { shouldValidate: true, shouldDirty: true });
  const [avgTransaction, setAvgTransaction] = useState(DEFAULT_AVG_TRANSACTION);

  // Persist volume in the URL (?volume=50000), debounced to avoid history spam
  const urlTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!volumeValid) return;
    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set('volume', String(volume));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(urlTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, volumeValid]);

  const recommended = recommendTier(volume);
  const selectedTier = PRICING_TIERS.find((tier) => tier.id === recommended)!;
  const totalFees = volumeValid ? estimateMonthlyCost(selectedTier, volume, avgTransaction) : null;
  const competitorFees = comparisonValid && volumeValid
    ? volume * competitorPercent / 100 + volume / avgTransaction * competitorFixed
    : null;
  const money = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
  const costs = useMemo(
    () =>
      PRICING_TIERS.map((tier) => ({
        tier,
        cost: estimateMonthlyCost(tier, volume, avgTransaction),
      })),
    [volume, avgTransaction]
  );

  const markers = useMemo(() => {
    const bounds = new Set<number>();
    PRICING_TIERS.forEach((tier) => {
      if (tier.minVolumeUsd > 1000 && tier.minVolumeUsd < 10000000) {
        bounds.add(tier.minVolumeUsd);
      }
      if (tier.maxVolumeUsd > 1000 && tier.maxVolumeUsd < 10000000) {
        bounds.add(tier.maxVolumeUsd);
      }
    });
    return Array.from(bounds).sort((a, b) => a - b);
  }, []);

  const discountExplanations = useMemo(() => {
    const starterTier = PRICING_TIERS.find((t) => t.id === 'starter')!;
    const growthTier = PRICING_TIERS.find((t) => t.id === 'growth')!;
    const enterpriseTier = PRICING_TIERS.find((t) => t.id === 'enterprise')!;

    const starterCost = estimateMonthlyCost(starterTier, volume, avgTransaction);
    const growthCost = estimateMonthlyCost(growthTier, volume, avgTransaction);

    const explanations: Record<string, string> = {
      starter: '',
      growth: '',
      enterprise: '',
    };

    // Starter explanation
    if (volume >= starterTier.maxVolumeUsd) {
      explanations.starter = `Upgrade to Growth at ${formatUsdCompact(starterTier.maxVolumeUsd)} to save fees`;
    } else {
      explanations.starter = 'Base rate (no monthly minimum)';
    }

    // Growth explanation
    if (volume < growthTier.minVolumeUsd) {
      explanations.growth = `Requires ${formatUsdCompact(growthTier.minVolumeUsd)}/mo minimum volume`;
    } else if (volume > growthTier.maxVolumeUsd) {
      explanations.growth = `Upgrade to Enterprise at ${formatUsdCompact(growthTier.maxVolumeUsd)} for custom rates`;
    } else {
      if (starterCost != null && growthCost != null && starterCost > growthCost) {
        explanations.growth = `Save ${formatUsd(starterCost - growthCost)} vs Starter`;
      } else {
        explanations.growth = 'Volume discount active';
      }
    }

    // Enterprise explanation
    if (volume < enterpriseTier.minVolumeUsd) {
      explanations.enterprise = `Requires ${formatUsdCompact(enterpriseTier.minVolumeUsd)}/mo volume for custom pricing`;
    } else {
      explanations.enterprise = 'Custom volume discounts apply';
    }

    return explanations;
  }, [volume, avgTransaction]);

  return (
    <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
      <div className="grid lg:grid-cols-2 gap-10">
        {/* Inputs */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Estimated monthly volume
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground" aria-live="polite">
            {volumeValid ? formatUsdCompact(volume) : 'Enter volume'}
            <span className="text-base font-medium text-muted-foreground"> / month</span>
          </p>

          <div className="mt-6 space-y-2">
            <Label htmlFor="monthly-volume">Monthly volume (USD)</Label>
            <input
              id="monthly-volume"
              type="number"
              min={MIN_VOLUME}
              max={MAX_VOLUME}
              step="1"
              {...register('volume', {
                valueAsNumber: true,
                required: 'Enter a monthly volume.',
                min: { value: MIN_VOLUME, message: `Enter at least ${formatUsd(MIN_VOLUME)}.` },
                max: { value: MAX_VOLUME, message: `Enter no more than ${formatUsd(MAX_VOLUME)}.` },
                validate: (value) => Number.isFinite(value) || 'Enter a valid volume.',
              })}
              aria-invalid={Boolean(errors.volume)}
              aria-describedby={errors.volume ? 'volume-error' : undefined}
              className="w-full rounded-lg border bg-background p-3"
            />
            {errors.volume && <p id="volume-error" role="alert" className="text-sm text-destructive">{errors.volume.message}</p>}
          </div>

          <div className="relative mt-6">
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={volumeToSlider(volume)}
              onChange={(e) => setVolume(sliderToVolume(Number(e.target.value)))}
              aria-label="Monthly transaction volume in US dollars"
              aria-valuetext={`${formatUsdCompact(volume)} per month`}
              className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
            />
            {/* Tick markers overlaying the slider track */}
            {markers.map((bound) => {
              const pos = volumeToSlider(bound);
              return (
                <div
                  key={bound}
                  className="absolute top-1/2 w-1.5 h-4 -translate-x-1/2 -translate-y-1/2 bg-primary/45 rounded-full pointer-events-none"
                  style={{ left: `${pos}%` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground relative h-6">
            <span className="absolute left-0 font-medium">$1k</span>
            {markers.map((bound) => {
              const pos = volumeToSlider(bound);
              return (
                <span
                  key={bound}
                  className="absolute -translate-x-1/2 font-semibold text-foreground/75"
                  style={{ left: `${pos}%` }}
                >
                  {formatUsdCompact(bound)}
                </span>
              );
            })}
            <span className="absolute right-0 font-medium">$10M</span>
          </div>

          <div className="mt-8">
            <p id="avg-transaction" className="text-sm font-medium text-foreground">
              Average transaction size
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="avg-transaction">
              {AVG_TRANSACTION_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setAvgTransaction(size)}
                  aria-pressed={avgTransaction === size}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                    avgTransaction === size
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  ${size}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {volumeValid ? `≈ ${Math.round(volume / avgTransaction).toLocaleString()} transactions per month` : 'Enter a valid volume to estimate transaction count.'}
            </p>
          </div>
        </div>

        {/* Per-tier cost */}
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3" aria-live="polite">
            <p className="font-semibold">Your estimate — {selectedTier.name}</p>
            {!volumeValid ? <p>Enter a valid monthly volume to calculate fees.</p> : (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt>Input volume</dt><dd className="text-right">{money(volume)}</dd>
                <dt>Tier fee</dt><dd className="text-right">{selectedTier.transactionFee}</dd>
                <dt>Total fees</dt><dd className="text-right">{totalFees == null ? 'Custom quote' : money(totalFees)}</dd>
                <dt>Net amount</dt><dd className="text-right">{totalFees == null ? 'Custom quote' : money(volume - totalFees)}</dd>
                <dt>Savings vs competitor</dt><dd className="text-right">{totalFees == null ? 'Custom quote' : competitorFees == null ? 'Enter competitor fees' : money(competitorFees - totalFees)}</dd>
              </dl>
            )}
            <p className="text-xs text-muted-foreground">Included volume and per-transaction charges follow the selected tier. Negative savings mean higher fees.</p>
          </div>
          <fieldset className="rounded-xl border p-4 space-y-3">
            <legend className="px-1 text-sm font-medium">Competitor comparison</legend>
            <p className="text-xs text-muted-foreground">Illustrative rates. Enter your provider’s fees for a personalized comparison.</p>
            <label className="block text-sm">
              Percentage fee (%)
              <input
                type="number" min="0" max="100" step="0.01"
                {...register('competitorPercent', { valueAsNumber: true, required: true, min: 0, max: 100 })}
                aria-invalid={Boolean(errors.competitorPercent)}
                className="mt-1 w-full rounded-lg border bg-background p-2"
              />
            </label>
            <label className="block text-sm">
              Fee per transaction (USD)
              <input
                type="number" min="0" step="0.01"
                {...register('competitorFixed', { valueAsNumber: true, required: true, min: 0 })}
                aria-invalid={Boolean(errors.competitorFixed)}
                className="mt-1 w-full rounded-lg border bg-background p-2"
              />
            </label>
            {!comparisonValid && <p role="alert" className="text-sm text-destructive">Enter a percentage from 0 to 100 and a non-negative transaction fee.</p>}
          </fieldset>
          {costs.map(({ tier, cost }) => {
            const isRecommended = tier.id === recommended;
            const explanation = discountExplanations[tier.id];
            return (
              <div
                key={tier.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors',
                  isRecommended ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {tier.name}
                    {isRecommended && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.transactionFee} per transaction</p>
                </div>
                <div className="text-right">
                  {cost != null && volumeValid ? (
                    <p className="text-lg font-bold text-foreground">{formatUsd(cost)}</p>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">{volumeValid ? 'Contact sales' : 'Enter volume'}</p>
                  )}
                  {volumeValid && explanation && (
                    <p className={cn(
                      "text-xs mt-0.5 flex items-center justify-end gap-1",
                      explanation.startsWith('Save') || explanation.includes('active') || explanation.includes('apply')
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-muted-foreground'
                    )}>
                      {(explanation.startsWith('Save') || explanation.includes('active') || explanation.includes('apply')) && (
                        <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <Link
            href={recommended === 'enterprise' ? '/contact?subject=enterprise-pricing' : '/auth/register'}
            className="block pt-2"
          >
            <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl">
              {recommended === 'enterprise' ? 'Contact Sales' : 'Get Started'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Estimates only. Actual fees are calculated per transaction at settlement.
          </p>
        </div>
      </div>
    </div>
  );
}
