import { DollarSign, Users, Heart, CheckCircle, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSeo } from '../lib/seo';

interface BecomeHostPageProps {
  onNavigate: (page: string) => void;
}

export const BecomeHostPage = ({ onNavigate }: BecomeHostPageProps) => {
  void onNavigate;
  const { t } = useLanguage();

  useSeo({
    title: 'Devino gazdă',
    description: 'Află cum poți publica experiențe și cazări locale pe Hodina.',
    canonicalPath: '/become-host',
  });

  const benefits = [
    {
      icon: DollarSign,
      title: t.becomeHost.benefit1,
      description: t.becomeHost.benefit1Desc,
    },
    {
      icon: Users,
      title: t.becomeHost.benefit2,
      description: t.becomeHost.benefit2Desc,
    },
    {
      icon: Heart,
      title: t.becomeHost.benefit3,
      description: t.becomeHost.benefit3Desc,
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Tell us about your experience',
      description: 'Share what makes your experience unique and special',
    },
    {
      number: '2',
      title: 'Set your schedule',
      description: 'Choose when you want to host and how many guests',
    },
    {
      number: '3',
      title: 'Start hosting',
      description: 'Welcome guests and create unforgettable memories',
    },
  ];

  const faqs = [
    {
      question: 'How much can I earn as a host?',
      answer: 'Earnings vary based on your experience type, location, and pricing. Many hosts earn between $500-$2000 per month.',
    },
    {
      question: 'What kind of experiences can I host?',
      answer: 'Anything from cooking classes, tours, workshops, to cultural experiences. If you\'re passionate about it, others will be too!',
    },
    {
      question: 'How does payment work?',
      answer: 'You set your own prices and we handle all payments. You receive payment 24 hours after the experience ends.',
    },
    {
      question: 'What support do I get?',
      answer: 'We provide 24/7 support, host resources, insurance coverage, and a community of hosts to help you succeed.',
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <section
        className="relative h-[500px] md:h-[600px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 38, 38, 0.5), rgba(0, 38, 38, 0.5)), url(https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {t.becomeHost.title}
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8">
            {t.becomeHost.subtitle}
          </p>
          <button className="bg-white text-[#002626] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors">
            {t.becomeHost.getStarted}
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {t.becomeHost.why}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#002626] text-white rounded-full mb-4">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-xl text-gray-600">
              Getting started is easy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#002626] text-white rounded-full font-bold text-xl mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Join thousands of hosts worldwide
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Be part of a global community of passionate hosts sharing their knowledge and culture with travelers from around the world.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Free to list your experience',
                'Set your own schedule and pricing',
                'Get paid securely through our platform',
                '24/7 host support and resources',
                'Insurance coverage included',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            <button className="bg-[#002626] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#003838] transition-colors">
              Start Hosting Today
            </button>
          </div>
          <div>
            <img
              src="https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg"
              alt="Happy hosts"
              className="w-full h-full object-cover rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm group"
              >
                <summary className="text-lg font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  {faq.question}
                  <span className="ml-4 text-[#002626]">+</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#002626] rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Have questions or need help? Our team is here to support you every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-white text-[#002626] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors">
              {t.becomeHost.getStarted}
            </button>
            <button className="flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-[#002626] transition-colors">
              <Mail className="w-5 h-5" />
              {t.becomeHost.contactUs}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
