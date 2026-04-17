import { useLanguage } from '../i18n/LanguageContext';
import { useSeo } from '../lib/seo';

type LegalKind = 'terms' | 'privacy';

interface LegalPageProps {
  kind: LegalKind;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

interface Section {
  heading: string;
  body: string[];
}

const getTermsContent = (language: string): { title: string; intro: string; sections: Section[] } => {
  if (language === 'ro') {
    return {
      title: 'Termeni și Condiții',
      intro:
        'Prin utilizarea platformei Hodina, confirmi că ai citit, ai înțeles și ești de acord cu acești Termeni. Dacă nu ești de acord, te rugăm să nu folosești platforma.',
      sections: [
        {
          heading: '1. Despre Hodina',
          body: [
            'Hodina SRL este o platformă online care facilitează rezervarea experiențelor turistice și a cazărilor oferite de hosts locali din Republica Moldova și din regiune. Hodina acționează ca intermediar între oaspeți și hosts.',
          ],
        },
        {
          heading: '2. Cont și utilizare',
          body: [
            'Pentru a rezerva sau a publica listări trebuie să ai cel puțin 18 ani și să creezi un cont cu informații reale. Ești responsabil pentru păstrarea confidențialității credențialelor.',
            'Nu ai voie să folosești platforma pentru activități ilegale, fraudă, spam sau încălcarea drepturilor altora.',
          ],
        },
        {
          heading: '3. Rezervări și plăți',
          body: [
            'Rezervările sunt confirmate fie instant, fie de către host. Prețul final include subtotalul și orice taxe aplicabile (ex. taxa de curățenie).',
            'Politica de anulare este stabilită de fiecare host și afișată pe pagina experienței sau a cazării. Rambursările se procesează conform acestei politici.',
          ],
        },
        {
          heading: '4. Responsabilitățile hosts-ilor',
          body: [
            'Hosts garantează că au dreptul legal de a oferi serviciile listate, că informațiile sunt exacte și că respectă legislația locală (inclusiv autorizații, taxe și sănătate publică).',
          ],
        },
        {
          heading: '5. Responsabilitățile oaspeților',
          body: [
            'Oaspeții respectă regulile casei, se prezintă la timp și tratează proprietatea cu grijă. Daunele pot fi reținute din garanție sau facturate separat.',
          ],
        },
        {
          heading: '6. Limitarea răspunderii',
          body: [
            'Hodina nu este răspunzătoare pentru calitatea efectivă a experiențelor sau cazărilor, care sunt furnizate de terți. Răspunderea Hodina este limitată la comisionul perceput pentru rezervarea în cauză.',
          ],
        },
        {
          heading: '7. Modificări ale termenilor',
          body: [
            'Putem actualiza Termenii. Vei fi notificat despre modificările semnificative prin email sau în aplicație. Continuarea utilizării platformei după modificare înseamnă acceptarea noilor termeni.',
          ],
        },
        {
          heading: '8. Contact',
          body: [
            'Pentru întrebări: legal@hodina.md. Sediul social: Chișinău, Republica Moldova.',
          ],
        },
      ],
    };
  }

  if (language === 'ru') {
    return {
      title: 'Условия использования',
      intro:
        'Используя платформу Hodina, вы подтверждаете, что прочитали, поняли и согласны с настоящими Условиями. Если вы не согласны, пожалуйста, не пользуйтесь платформой.',
      sections: [
        {
          heading: '1. О Hodina',
          body: [
            'Hodina — это онлайн-платформа для бронирования туристических впечатлений и жилья, предлагаемых местными хостами в Молдове и регионе. Hodina выступает посредником между гостями и хостами.',
          ],
        },
        {
          heading: '2. Аккаунт и использование',
          body: [
            'Для бронирования и публикации объявлений необходимо быть старше 18 лет и создать аккаунт с достоверными данными. Вы несёте ответственность за сохранение учётных данных.',
            'Запрещено использовать платформу для незаконных действий, мошенничества, спама или нарушения прав других пользователей.',
          ],
        },
        {
          heading: '3. Бронирования и оплата',
          body: [
            'Бронирования подтверждаются автоматически или хостом. Итоговая цена включает стоимость и применимые сборы (например, уборка).',
            'Политика отмены устанавливается хостом и отображается на странице предложения. Возвраты осуществляются в соответствии с этой политикой.',
          ],
        },
        {
          heading: '4. Обязанности хостов',
          body: [
            'Хосты гарантируют, что имеют право предоставлять услуги, что информация достоверна и соответствует местному законодательству (лицензии, налоги, санитарные нормы).',
          ],
        },
        {
          heading: '5. Обязанности гостей',
          body: [
            'Гости соблюдают правила проживания, приходят вовремя и бережно относятся к имуществу. За ущерб может быть удержан залог или выставлен отдельный счёт.',
          ],
        },
        {
          heading: '6. Ограничение ответственности',
          body: [
            'Hodina не несёт ответственности за фактическое качество услуг, предоставляемых третьими сторонами. Ответственность Hodina ограничена размером комиссии за конкретную бронь.',
          ],
        },
        {
          heading: '7. Изменения условий',
          body: [
            'Мы можем обновлять настоящие Условия. О существенных изменениях вас уведомят по email или в приложении. Продолжение использования означает согласие.',
          ],
        },
        {
          heading: '8. Контакты',
          body: ['По вопросам: legal@hodina.md. Юридический адрес: Кишинёв, Республика Молдова.'],
        },
      ],
    };
  }

  return {
    title: 'Terms & Conditions',
    intro:
      'By using the Hodina platform, you confirm that you have read, understood and agree to these Terms. If you do not agree, please do not use the platform.',
    sections: [
      {
        heading: '1. About Hodina',
        body: [
          'Hodina SRL operates an online platform that facilitates the booking of experiences and stays offered by local hosts in the Republic of Moldova and the region. Hodina acts as an intermediary between guests and hosts.',
        ],
      },
      {
        heading: '2. Account & usage',
        body: [
          'To book or publish listings you must be at least 18 years old and create an account with accurate information. You are responsible for safeguarding your credentials.',
          'You may not use the platform for illegal activity, fraud, spam, or to infringe the rights of others.',
        ],
      },
      {
        heading: '3. Bookings & payments',
        body: [
          'Bookings are either confirmed instantly or by the host. The final price includes the subtotal plus applicable fees (e.g. cleaning).',
          'Cancellation policies are set by each host and shown on the listing page. Refunds follow that policy.',
        ],
      },
      {
        heading: '4. Host responsibilities',
        body: [
          'Hosts warrant that they have the legal right to provide the listed services, that the information is accurate, and that they comply with local law (permits, taxes, public health).',
        ],
      },
      {
        heading: '5. Guest responsibilities',
        body: [
          'Guests must respect house rules, arrive on time, and treat the property with care. Damages may be deducted from deposits or billed separately.',
        ],
      },
      {
        heading: '6. Limitation of liability',
        body: [
          'Hodina is not responsible for the actual quality of services, which are delivered by third parties. Hodina liability is limited to the commission charged for the specific booking.',
        ],
      },
      {
        heading: '7. Changes to the terms',
        body: [
          'We may update these Terms. You will be notified of material changes by email or in-app. Continued use after changes take effect means acceptance.',
        ],
      },
      {
        heading: '8. Contact',
        body: ['Questions: legal@hodina.md. Registered office: Chisinau, Republic of Moldova.'],
      },
    ],
  };
};

const getPrivacyContent = (language: string): { title: string; intro: string; sections: Section[] } => {
  if (language === 'ro') {
    return {
      title: 'Politica de Confidențialitate',
      intro:
        'Prezenta Politică descrie cum Hodina colectează, folosește și protejează datele tale cu caracter personal, în conformitate cu Regulamentul UE 2016/679 (GDPR) și legea Republicii Moldova.',
      sections: [
        {
          heading: '1. Operator de date',
          body: [
            'Operatorul este Hodina SRL, Chișinău, Republica Moldova. Contact protecția datelor: privacy@hodina.md.',
          ],
        },
        {
          heading: '2. Ce date colectăm',
          body: [
            'Date de cont (nume, email, telefon, parolă criptată), date de rezervare, mesaje între oaspeți și hosts, adresă IP, preferințe de limbă, date de utilizare a aplicației.',
            'Nu stocăm detaliile cardului. Plățile sunt procesate de furnizori certificați PCI-DSS.',
          ],
        },
        {
          heading: '3. Scopurile și temeiul juridic',
          body: [
            'Executarea contractului (gestionarea rezervărilor), interes legitim (prevenirea fraudei, analytics anonimizate), consimțământ (marketing, cookie-uri neesențiale), obligație legală (fiscale, contabile).',
          ],
        },
        {
          heading: '4. Destinatari',
          body: [
            'Hosts-ii (doar datele minime necesare rezervării), furnizori de hosting, email, plăți și analytics, autorități publice dacă este obligatoriu prin lege.',
          ],
        },
        {
          heading: '5. Transfer internațional',
          body: [
            'Unii furnizori pot fi localizați în afara SEE. În astfel de cazuri folosim clauze contractuale standard aprobate de Comisia Europeană.',
          ],
        },
        {
          heading: '6. Perioada de stocare',
          body: [
            'Datele contului sunt păstrate cât timp contul este activ și până la 7 ani de la ultima rezervare (obligații fiscale). Mesajele sunt șterse după 2 ani de inactivitate.',
          ],
        },
        {
          heading: '7. Drepturile tale',
          body: [
            'Acces, rectificare, ștergere, restricționare, opoziție, portabilitate, retragerea consimțământului, plângere la Centrul Național pentru Protecția Datelor cu Caracter Personal.',
            'Cereri: privacy@hodina.md. Răspundem în maximum 30 de zile.',
          ],
        },
        {
          heading: '8. Cookie-uri',
          body: [
            'Folosim cookie-uri esențiale (necesare funcționării) și, cu consimțământul tău, cookie-uri analitice și de marketing. Setările pot fi schimbate oricând din banner sau din contul tău.',
          ],
        },
        {
          heading: '9. Securitate',
          body: [
            'Criptare în tranzit (HTTPS), parole hash-uite, acces pe bază de rol, audit log-uri. Incidentele grave sunt notificate autorităților în 72 de ore.',
          ],
        },
      ],
    };
  }

  if (language === 'ru') {
    return {
      title: 'Политика конфиденциальности',
      intro:
        'Настоящая Политика описывает, как Hodina собирает, использует и защищает ваши персональные данные в соответствии с GDPR (ЕС 2016/679) и законодательством Молдовы.',
      sections: [
        {
          heading: '1. Оператор данных',
          body: [
            'Оператор — Hodina SRL, Кишинёв, Республика Молдова. Контакт по защите данных: privacy@hodina.md.',
          ],
        },
        {
          heading: '2. Какие данные мы собираем',
          body: [
            'Данные аккаунта (имя, email, телефон, хешированный пароль), данные бронирований, сообщения между гостями и хостами, IP-адрес, языковые предпочтения, данные использования.',
            'Мы не храним данные карт. Платежи обрабатываются поставщиками с PCI-DSS сертификацией.',
          ],
        },
        {
          heading: '3. Цели и правовая основа',
          body: [
            'Исполнение договора (бронирования), законный интерес (предотвращение мошенничества, анонимная аналитика), согласие (маркетинг, необязательные cookies), юридическая обязанность (налоги).',
          ],
        },
        {
          heading: '4. Получатели',
          body: [
            'Хосты (только минимум данных для бронирования), провайдеры хостинга/email/платежей/аналитики, государственные органы при обязательных запросах.',
          ],
        },
        {
          heading: '5. Международная передача',
          body: [
            'Некоторые провайдеры находятся за пределами ЕЭЗ. В таких случаях применяются стандартные договорные положения ЕС.',
          ],
        },
        {
          heading: '6. Срок хранения',
          body: [
            'Данные аккаунта — пока аккаунт активен и до 7 лет после последнего бронирования. Сообщения — 2 года неактивности.',
          ],
        },
        {
          heading: '7. Ваши права',
          body: [
            'Доступ, исправление, удаление, ограничение, возражение, переносимость, отзыв согласия, жалоба в надзорный орган.',
            'Запросы: privacy@hodina.md. Отвечаем в течение 30 дней.',
          ],
        },
        {
          heading: '8. Cookies',
          body: [
            'Используем необходимые cookies и, с согласия, аналитические и маркетинговые. Настройки можно изменить в баннере или в аккаунте.',
          ],
        },
        {
          heading: '9. Безопасность',
          body: ['HTTPS, хеширование паролей, ролевой доступ, аудит. Серьёзные инциденты — уведомление в 72 ч.'],
        },
      ],
    };
  }

  return {
    title: 'Privacy Policy',
    intro:
      'This Policy describes how Hodina collects, uses and protects your personal data in accordance with the EU General Data Protection Regulation (2016/679) and the laws of the Republic of Moldova.',
    sections: [
      {
        heading: '1. Data controller',
        body: [
          'The controller is Hodina SRL, Chisinau, Republic of Moldova. Data protection contact: privacy@hodina.md.',
        ],
      },
      {
        heading: '2. Data we collect',
        body: [
          'Account data (name, email, phone, hashed password), booking data, messages between guests and hosts, IP address, language preferences, product usage data.',
          'We never store card details. Payments are processed by PCI-DSS certified providers.',
        ],
      },
      {
        heading: '3. Purposes & legal basis',
        body: [
          'Contract performance (booking management), legitimate interest (fraud prevention, anonymised analytics), consent (marketing, non-essential cookies), legal obligation (tax, accounting).',
        ],
      },
      {
        heading: '4. Recipients',
        body: [
          'Hosts (only the minimum needed for the booking), hosting/email/payments/analytics providers, public authorities when legally required.',
        ],
      },
      {
        heading: '5. International transfers',
        body: [
          'Some providers sit outside the EEA. We rely on EU Standard Contractual Clauses in those cases.',
        ],
      },
      {
        heading: '6. Retention',
        body: [
          'Account data is kept while the account is active and up to 7 years after the last booking (tax law). Messages are erased after 2 years of inactivity.',
        ],
      },
      {
        heading: '7. Your rights',
        body: [
          'Access, rectification, erasure, restriction, objection, portability, consent withdrawal, complaint to a supervisory authority.',
          'Requests: privacy@hodina.md. We reply within 30 days.',
        ],
      },
      {
        heading: '8. Cookies',
        body: [
          'We use essential cookies and, with your consent, analytics and marketing cookies. Preferences can be changed anytime from the banner or your account.',
        ],
      },
      {
        heading: '9. Security',
        body: ['HTTPS in transit, password hashing, role-based access, audit logs. Serious incidents reported to authorities within 72 hours.'],
      },
    ],
  };
};

export const LegalPage = ({ kind, onNavigate }: LegalPageProps) => {
  const { language } = useLanguage();
  const content = kind === 'terms' ? getTermsContent(language) : getPrivacyContent(language);

  useSeo({
    title: `${content.title} · Hodina`,
    description: content.intro,
    canonicalPath: kind === 'terms' ? '/terms' : '/privacy',
  });

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-16">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('home')}
          className="mb-6 text-sm font-semibold text-[#002626] hover:underline"
        >
          ← {language === 'ro' ? 'Înapoi' : language === 'ru' ? 'Назад' : 'Back'}
        </button>

        <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">{content.title}</h1>
        <p className="mb-10 text-lg text-gray-600">{content.intro}</p>

        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mb-3 leading-relaxed text-gray-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          <p>
            {language === 'ro'
              ? 'Ultima actualizare: 2026. Pentru întrebări: '
              : language === 'ru'
                ? 'Последнее обновление: 2026. Вопросы: '
                : 'Last updated: 2026. Questions: '}
            <a href="mailto:privacy@hodina.md" className="font-medium text-[#002626] underline">
              privacy@hodina.md
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
