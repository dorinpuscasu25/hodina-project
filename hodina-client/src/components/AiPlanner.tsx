import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { formatCurrency, formatDuration } from '../lib/utils';

export type AiSuggestionKind = 'experience' | 'accommodation';

export interface AiSuggestion {
  kind: AiSuggestionKind;
  id: number;
  slug: string;
  title: string;
  short_description?: string;
  city?: string | null;
  category?: string | null;
  price_amount: number;
  currency: string;
  duration_minutes?: number;
  cover_image?: string | null;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AiSuggestion[];
}

interface AiPlanResponse {
  data: {
    reply: string;
    suggestions: AiSuggestion[];
  };
}

interface AiPlannerProps {
  variant: 'hero' | 'chat';
  messages: AiChatMessage[];
  setMessages: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  onSuggestionClick: (suggestion: AiSuggestion) => void;
  onClose?: () => void;
  initialPlaceholder?: string;
}

const SUGGESTION_PROMPTS: Record<'ro' | 'ru' | 'en', string[]> = {
  ro: [
    'Weekend romantic cu cazare la cramă',
    'Aventură cu prietenii în natură',
    'Tur gastronomic cu degustare de vinuri',
  ],
  ru: [
    'Романтические выходные с ночёвкой на винодельне',
    'Активный отдых с друзьями',
    'Гастрономический тур с дегустацией вин',
  ],
  en: [
    'Romantic weekend with a winery stay',
    'Outdoor adventure with friends',
    'Gastronomy tour with wine tasting',
  ],
};

interface HeroTemplate {
  emoji: string;
  title: string;
  meta: string;
  prompt: string;
}

const HERO_TEMPLATES: Record<'ro' | 'ru' | 'en', HeroTemplate[]> = {
  ro: [
    {
      emoji: '🍷',
      title: 'Weekend la cramă',
      meta: '2 zile · degustare + cazare',
      prompt: 'Vreau un weekend de 2 zile la o cramă din Moldova, cu degustare de vinuri, cină tradițională și o cazare confortabilă în apropiere.',
    },
    {
      emoji: '🥾',
      title: 'Aventură în natură',
      meta: '1 zi · drumeție + priveliști',
      prompt: 'Plănuiesc o ieșire de o zi în natură: drumeție ușoară, priveliști frumoase și un loc bun pentru picnic sau prânz local.',
    },
    {
      emoji: '🏛️',
      title: 'Tur cultural Orheiul Vechi',
      meta: '1 zi · istorie + tradiții',
      prompt: 'Aș vrea să descopăr Orheiul Vechi și împrejurimile — mănăstiri, locuri istorice și o experiență tradițională moldovenească.',
    },
    {
      emoji: '💕',
      title: 'Escapadă romantică',
      meta: '2 nopți · doar pentru doi',
      prompt: 'Caut o escapadă romantică de 2 nopți pentru noi doi: cazare cu vibe intim, cină specială și o activitate de cuplu.',
    },
    {
      emoji: '👨‍👩‍👧',
      title: 'Weekend cu familia',
      meta: '2 zile · activități pentru copii',
      prompt: 'Vreau un weekend în Moldova cu copiii: activități prietenoase pentru familie, cazare comodă și ceva educativ-distractiv.',
    },
    {
      emoji: '🍳',
      title: 'Experiență gastronomică',
      meta: '1 zi · masterclass + degustare',
      prompt: 'Mă interesează o experiență gastronomică: un masterclass de bucătărie tradițională moldovenească urmat de o degustare.',
    },
  ],
  ru: [
    {
      emoji: '🍷',
      title: 'Выходные на винодельне',
      meta: '2 дня · дегустация + ночёвка',
      prompt: 'Хочу провести 2 дня на винодельне в Молдове: дегустация вин, традиционный ужин и удобное жильё рядом.',
    },
    {
      emoji: '🥾',
      title: 'Приключение на природе',
      meta: '1 день · поход + виды',
      prompt: 'Планирую однодневную вылазку на природу: лёгкий поход, красивые виды и хорошее место для пикника или обеда.',
    },
    {
      emoji: '🏛️',
      title: 'Старый Орхей',
      meta: '1 день · история + традиции',
      prompt: 'Хочу открыть для себя Старый Орхей: монастыри, исторические места и аутентичная молдавская традиция.',
    },
    {
      emoji: '💕',
      title: 'Романтический побег',
      meta: '2 ночи · только для двоих',
      prompt: 'Ищу романтический побег на 2 ночи для двоих: уютное жильё, особенный ужин и активность для пары.',
    },
    {
      emoji: '👨‍👩‍👧',
      title: 'Семейные выходные',
      meta: '2 дня · с детьми',
      prompt: 'Хочу провести выходные в Молдове с детьми: семейные активности, удобное жильё и что-то познавательное.',
    },
    {
      emoji: '🍳',
      title: 'Гастрономия',
      meta: '1 день · мастер-класс + дегустация',
      prompt: 'Интересует гастрономический опыт: мастер-класс молдавской кухни и дегустация местных блюд.',
    },
  ],
  en: [
    {
      emoji: '🍷',
      title: 'Winery weekend',
      meta: '2 days · tasting + stay',
      prompt: 'I want a 2-day winery weekend in Moldova: wine tasting, traditional dinner and a cozy stay nearby.',
    },
    {
      emoji: '🥾',
      title: 'Nature adventure',
      meta: '1 day · hike + views',
      prompt: 'I am planning a one-day nature trip: easy hike, scenic views and a good spot for a picnic or local lunch.',
    },
    {
      emoji: '🏛️',
      title: 'Orheiul Vechi tour',
      meta: '1 day · history + tradition',
      prompt: 'I want to explore Orheiul Vechi and the area — monasteries, historical sites and a traditional Moldovan experience.',
    },
    {
      emoji: '💕',
      title: 'Romantic escape',
      meta: '2 nights · just the two of us',
      prompt: 'Looking for a 2-night romantic escape for the two of us: intimate stay, special dinner and a couple activity.',
    },
    {
      emoji: '👨‍👩‍👧',
      title: 'Family weekend',
      meta: '2 days · kid-friendly',
      prompt: 'I want a Moldova weekend with the kids: family-friendly activities, comfortable stay and something educational and fun.',
    },
    {
      emoji: '🍳',
      title: 'Food experience',
      meta: '1 day · class + tasting',
      prompt: 'Interested in a food experience: a Moldovan cooking masterclass followed by a tasting of local dishes.',
    },
  ],
};

export const AiPlanner = ({
  variant,
  messages,
  setMessages,
  onSuggestionClick,
  onClose,
  initialPlaceholder,
}: AiPlannerProps) => {
  const { language } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang: 'ro' | 'ru' | 'en' = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'ro';

  const t = {
    title:
      lang === 'ro'
        ? 'Descrie călătoria ta. AI o planifică.'
        : lang === 'ru'
          ? 'Опиши путешествие. ИИ соберёт маршрут.'
          : 'Describe your trip. AI plans it for you.',
    subtitle:
      lang === 'ro'
        ? 'Spune-ne ce vrei să faci — vibe, persoane, buget — și AI alege din experiențele și cazările Hodina.'
        : lang === 'ru'
          ? 'Расскажи, что хочешь — настроение, компанию, бюджет — и ИИ подберёт варианты на Hodina.'
          : 'Tell us your vibe, people, and budget — AI picks from Hodina experiences and stays.',
    placeholder:
      initialPlaceholder ??
      (lang === 'ro'
        ? 'Ex: un weekend gastronomic cu degustare și o drumeție ușoară'
        : lang === 'ru'
          ? 'Например: гастрономические выходные с дегустацией и лёгким походом'
          : 'E.g. a gastronomy weekend with tasting and an easy hike'),
    askMore:
      lang === 'ro'
        ? 'Întreabă altceva'
        : lang === 'ru'
          ? 'Спросить ещё'
          : 'Ask follow-up',
    plan:
      lang === 'ro' ? 'Planifică cu AI' : lang === 'ru' ? 'Составить маршрут' : 'Plan with AI',
    send: lang === 'ro' ? 'Trimite' : lang === 'ru' ? 'Отправить' : 'Send',
    chatTitle:
      lang === 'ro'
        ? 'Asistent AI Hodina'
        : lang === 'ru'
          ? 'AI-ассистент Hodina'
          : 'Hodina AI assistant',
    chatHint:
      lang === 'ro'
        ? 'Continuă conversația sau cere alte sugestii.'
        : lang === 'ru'
          ? 'Продолжайте разговор или попросите другие варианты.'
          : 'Keep chatting or ask for different picks.',
    suggestions:
      lang === 'ro'
        ? 'Sugestii pentru tine'
        : lang === 'ru'
          ? 'Варианты для вас'
          : 'Picks for you',
    inspirations:
      lang === 'ro' ? 'Idei rapide' : lang === 'ru' ? 'Быстрые идеи' : 'Quick ideas',
    thinking:
      lang === 'ro' ? 'AI analizează...' : lang === 'ru' ? 'ИИ думает...' : 'AI is thinking...',
  };

  useEffect(() => {
    if (variant !== 'chat') return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, variant]);

  const sendPrompt = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setPrompt('');

    const history = messages
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setIsSending(true);

    try {
      const response = await apiRequest<AiPlanResponse>('/public/ai/plan', {
        method: 'POST',
        body: {
          prompt: trimmed,
          history,
          locale: lang,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.reply,
          suggestions: response.data.suggestions,
        },
      ]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendPrompt(prompt);
  };

  const renderSuggestionCard = (suggestion: AiSuggestion) => {
    return (
      <button
        key={`${suggestion.kind}-${suggestion.id}`}
        type="button"
        onClick={() => onSuggestionClick(suggestion)}
        className="group flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#002626] hover:shadow-md"
      >
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={suggestion.cover_image ?? 'https://placehold.co/200x200?text=Hodina'}
            alt={suggestion.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                suggestion.kind === 'experience'
                  ? 'bg-[#fff4f1] text-[#944236]'
                  : 'bg-[#e6f0ee] text-[#17332d]'
              }`}
            >
              {suggestion.kind === 'experience'
                ? lang === 'ro'
                  ? 'Experiență'
                  : lang === 'ru'
                    ? 'Впечатление'
                    : 'Experience'
                : lang === 'ro'
                  ? 'Cazare'
                  : lang === 'ru'
                    ? 'Жильё'
                    : 'Stay'}
            </span>
            {suggestion.city ? (
              <span className="truncate text-xs text-gray-500">{suggestion.city}</span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
            {suggestion.title}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              {suggestion.kind === 'experience' && suggestion.duration_minutes
                ? formatDuration(suggestion.duration_minutes)
                : suggestion.category ?? ''}
            </span>
            <span className="font-bold text-[#002626]">
              {formatCurrency(suggestion.price_amount, suggestion.currency)}
            </span>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#002626]" />
      </button>
    );
  };

  if (variant === 'hero') {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const heroSuggestions = lastAssistant?.suggestions ?? [];

    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002626] via-[#0a3a3a] to-[#17332d] p-6 shadow-2xl md:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#efc4be]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#944236]/20 blur-3xl" />

        <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <span>
                {lang === 'ro'
                  ? 'Planificare AI'
                  : lang === 'ru'
                    ? 'ИИ-планировщик'
                    : 'AI planning'}
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {t.title}
            </h1>

            <p className="mb-6 text-base text-white/80 md:text-lg">{t.subtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#efc4be]" />
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={3}
                  placeholder={t.placeholder}
                  disabled={isSending}
                  className="w-full rounded-2xl border-0 bg-white/95 py-3.5 pl-12 pr-4 text-gray-800 shadow-lg outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#efc4be] disabled:opacity-70"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTION_PROMPTS[lang].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setPrompt(idea)}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-[#efc4be] hover:bg-white/10 hover:text-white"
                  >
                    {idea}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isSending}
                className="group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#efc4be] px-7 py-3.5 text-base font-semibold text-[#002626] shadow-lg shadow-black/20 transition-all hover:bg-white hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>{t.plan}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-[#efc4be]/40 bg-white/10 px-4 py-3 text-sm text-[#efc4be]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm md:p-5">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#efc4be]" />
                  <p className="text-sm font-semibold text-white">{t.inspirations}</p>
                </div>
                <p className="text-xs text-white/70">
                  {lang === 'ro'
                    ? 'Apasă pe un șablon și AI îți propune din Hodina.'
                    : lang === 'ru'
                      ? 'Нажми на шаблон — ИИ подберёт варианты с Hodina.'
                      : 'Tap a template — AI will pick from Hodina.'}
                </p>

                <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {HERO_TEMPLATES[lang].map((template) => (
                    <button
                      key={template.title}
                      type="button"
                      onClick={() => void sendPrompt(template.prompt)}
                      disabled={isSending}
                      className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#efc4be]/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                        {template.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {template.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-white/70">
                          {template.meta}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#efc4be]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lastAssistant ? (
                  <p className="rounded-xl bg-white/10 p-3 text-sm text-white/90">
                    {lastAssistant.content}
                  </p>
                ) : null}

                {heroSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#efc4be]">
                      {t.suggestions}
                    </p>
                    {heroSuggestions.map(renderSuggestionCard)}
                  </div>
                ) : null}

                <p className="text-xs text-white/60">{t.chatHint}</p>
              </div>
            )}

            {isSending ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.thinking}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#002626] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{t.chatTitle}</p>
            <p className="text-xs text-gray-500">{t.chatHint}</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-gray-900">
              {lang === 'ro'
                ? 'Salut! Cu ce te pot ajuta?'
                : lang === 'ru'
                  ? 'Привет! Чем могу помочь?'
                  : 'Hi! How can I help?'}
            </p>
            <p className="mt-2 text-gray-600">{t.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTION_PROMPTS[lang].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => void sendPrompt(idea)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#002626] hover:text-[#002626]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'bg-[#002626] text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {message.suggestions.map(renderSuggestionCard)}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isSending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.thinking}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
            {error}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#002626]">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendPrompt(prompt);
              }
            }}
            rows={1}
            placeholder={t.placeholder}
            disabled={isSending}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isSending}
            aria-label={t.send}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#002626] text-white transition-colors hover:bg-[#003838] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
