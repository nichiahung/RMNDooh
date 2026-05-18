'use client';

import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { MapPin, Users, Monitor, Clock, Calendar, Check } from 'lucide-react';
import { imgSrc } from '@/utils/imgSrc';
import { useI18n } from '@/i18n/I18nProvider';
import { computeMatchScore } from '@/utils/matchScore';
import { Modal } from '@/components/ui/Modal';

interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onClose: () => void;
  onAdd: () => void;
  objective?: string;
}

export function InventoryDetailCard({ item, isSelected, onClose, onAdd, objective }: Props) {
  const { t } = useI18n();

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
        <div className="h-44 sm:h-64 relative bg-slate-100 flex-shrink-0">
          <img
            src={imgSrc(item.imageUrl)}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579548485295-e2336336e8b4?auto=format&fit=crop&q=80&w=800'; }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase border border-indigo-100">
                  {item.venueType}
                </span>
                <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase border border-slate-200">
                  {item.screenType}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{item.name}</h2>
              <p className="text-slate-500 flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
                {item.address}, {item.district}, {item.city}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:w-64 flex-shrink-0">
              <div className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('detail.pricing')}</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(item.pricePerDay)} <span className="text-sm font-normal text-slate-500">{t('detail.perDay')}</span></div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('detail.efficiency')}</div>
                <div className="text-sm font-semibold text-indigo-600">NT${formatCPM(item.cpm)} CPM</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">{t('detail.description')}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">{t('detail.audienceDemographics')}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.audienceTags.map(tag => (
                    <span key={tag} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-md border border-blue-100">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">{t('detail.locationSpecs')}</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Users className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{formatNumber(item.dailyImpressions)}</div>
                      <div className="text-xs text-slate-500">{t('detail.estDailyImp')}</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Clock className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">06:00 - 24:00</div>
                      <div className="text-xs text-slate-500">{t('detail.operatingHours')}</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Calendar className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{t('detail.minBookingDays')}</div>
                      <div className="text-xs text-slate-500">{t('detail.minBooking')}</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Monitor className="w-4 h-4 text-slate-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{(item.availability * 100).toFixed(0)}%</div>
                      <div className="text-xs text-slate-500">{t('detail.currentAvailability')}</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* DNA Panel */}
          <div className="space-y-6 mt-6 pt-6 border-t border-slate-100">

            {objective && (() => {
              const score = computeMatchScore(item, objective);
              const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#94a3b8';
              const label = score >= 75 ? t('detail.dna.matchHigh') : score >= 50 ? t('detail.dna.matchPartial') : t('detail.dna.matchLow');
              return (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3"
                        strokeDasharray="100 100" />
                      <circle cx="18" cy="18" r="15.9155" fill="none"
                        stroke={color} strokeWidth="3"
                        strokeDasharray={`${score} ${100 - score}`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="text-sm font-bold text-slate-800 z-10">{score}%</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">與「{objective}」目標的受眾吻合度</div>
                  </div>
                </div>
              );
            })()}

            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('detail.dna.audienceProfile')}</h3>

              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-2 font-medium">{t('detail.dna.ageBreakdown')}</div>
                <div className="space-y-2">
                  {item.dna.ageBreakdown.map(({ label, pct }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-12 flex-shrink-0">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-2 font-medium">{t('detail.dna.genderSplit')}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-12 flex-shrink-0">{t('detail.dna.male')} {item.dna.genderSplit.male}%</span>
                  <div className="flex-1 flex h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full" style={{ width: `${item.dna.genderSplit.male}%` }} />
                    <div className="bg-pink-400 h-full flex-1" />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{t('detail.dna.female')} {item.dna.genderSplit.female}%</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 mb-2 font-medium">{t('detail.dna.mainSegments')}</div>
              <div className="flex flex-wrap gap-2">
                {item.dna.audienceSegments.map(({ label, pct }) => (
                  <span key={label} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {label} {pct}%
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('detail.dna.peakHours')}</h3>
              <div className="flex items-end gap-px h-12">
                {(() => {
                  const top3Set = new Set(
                    [...item.dna.peakHours]
                      .map((v, i) => ({ v, i }))
                      .sort((a, b) => b.v - a.v)
                      .slice(0, 3)
                      .map(entry => entry.i)
                  );
                  return item.dna.peakHours.map((intensity, hour) => {
                    const isTop3 = top3Set.has(hour);
                    return (
                      <div
                        key={hour}
                        className="flex-1"
                        style={{ height: `${Math.max(4, intensity * 100)}%` }}
                        title={`${hour}:00 — ${intensity.toFixed(1)}x`}
                      >
                        <div className={`w-full h-full rounded-sm ${isTop3 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
                {[0, 6, 12, 18, 23].map(h => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('detail.dna.weekdayDistribution')}</h3>
              <div className="space-y-2">
                {[
                  { label: t('detail.dna.weekday'), pct: item.dna.weekdayPct, color: 'bg-indigo-500' },
                  { label: t('detail.dna.weekend'), pct: 100 - item.dna.weekdayPct, color: 'bg-violet-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-8 flex-shrink-0">{label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('detail.dna.nearbyPOI')}</h3>
              <ul className="space-y-2">
                {item.dna.nearbyPOIs.map(({ name, distance }) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      {name}
                    </span>
                    <span className="text-xs text-slate-400 ml-4 flex-shrink-0">{distance}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('detail.dna.rankings')}</h3>
              <div className="flex flex-wrap gap-2">
                <RankChip label={t('detail.dna.nationwide')} rank={item.dna.rankings.cityRank} total={item.dna.rankings.cityTotal} />
                <RankChip label={item.district} rank={item.dna.rankings.districtRank} total={item.dna.rankings.districtTotal} />
                <RankChip label={item.screenType} rank={item.dna.rankings.typeRank} total={item.dna.rankings.typeTotal} />
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t('detail.close')}
          </button>
          <button
            onClick={onAdd}
            disabled={isSelected}
            className={`flex items-center px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              isSelected
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSelected ? (
              <><Check className="w-4 h-4 mr-2" /> {t('detail.addedToPlan')}</>
            ) : (
              t('detail.addToMediaPlan')
            )}
          </button>
        </div>

    </Modal>
  );
}

function RankChip({ label, rank, total }: { label: string; rank: number; total: number }) {
  const isTop3 = rank <= 3;
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      isTop3
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      {isTop3 && '🏆'} {label} #{rank} / {total}
    </span>
  );
}
