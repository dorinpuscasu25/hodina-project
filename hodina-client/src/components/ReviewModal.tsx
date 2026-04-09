import type { Review } from '../types';
import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ReviewModalProps {
  experienceTitle: string;
  onClose: () => void;
  initialReview?: Review | null;
  isSubmitting?: boolean;
  onSubmit: (review: { rating: number; title: string; comment: string }) => Promise<void> | void;
}

export const ReviewModal = ({ experienceTitle, initialReview, isSubmitting = false, onClose, onSubmit }: ReviewModalProps) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState(initialReview?.title ?? '');
  const [comment, setComment] = useState(initialReview?.comment ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0 && comment.trim()) {
      try {
        await onSubmit({ rating, title, comment });
        onClose();
      } catch {
        // Error state is handled by the parent page.
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{initialReview ? 'Editează review-ul' : 'Lasă un review'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-2">Pentru:</p>
            <p className="font-semibold text-lg text-gray-900">{experienceTitle}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      value <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-4 text-lg font-semibold text-gray-900">
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titlu
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="ex: Gazdă atentă și experiență foarte bine organizată"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review-ul tău
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              placeholder="Povestește pe scurt cum a fost experiența ta..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#002626] resize-none"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Minimum 20 caractere ({comment.length}/20)
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0 || comment.length < 20}
              className="flex-1 px-6 py-3 bg-[#002626] text-white rounded-xl font-semibold hover:bg-[#003838] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Se salvează...' : initialReview ? 'Actualizează review-ul' : 'Trimite review-ul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
