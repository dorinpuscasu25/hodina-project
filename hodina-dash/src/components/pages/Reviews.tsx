import React, { useState } from 'react';
import { Star, MessageCircle } from 'lucide-react';

export default function Reviews() {
  const [reviews] = useState([
    {
      id: 1,
      guestName: 'Karan Shivraj',
      listingName: 'Blewr Cafe',
      date: '13th March 2025',
      rating: 4.5,
      avatar: 'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=100',
      review: 'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.'
    },
    {
      id: 2,
      guestName: 'Shree Preet',
      listingName: 'Blewr Cafe',
      date: '5th May 2025',
      rating: 4.5,
      avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100',
      review: 'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.'
    },
    {
      id: 3,
      guestName: 'Maria Rodriguez',
      listingName: 'Mountain View Cabin',
      date: '28th February 2025',
      rating: 5.0,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
      review: 'Exceptional experience! The host was incredibly welcoming and the space exceeded all expectations. Every detail was thoughtfully considered and the location was perfect for our needs. Would definitely recommend to anyone looking for a memorable stay.'
    },
    {
      id: 4,
      guestName: 'James Wilson',
      listingName: 'City Center Loft',
      date: '15th January 2025',
      rating: 4.0,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
      review: 'Great location and clean space. The host was responsive and helpful throughout our stay. Minor issues with the heating but overall a positive experience. The neighborhood has excellent restaurants and easy access to public transport.'
    }
  ]);

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="h-4 w-4 text-gray-300 fill-current" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300 fill-current" />
      );
    }

    return stars;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">All Reviews</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Reviews</span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-8">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <img
                  src={review.avatar}
                  alt={review.guestName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {review.guestName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      On <span className="text-[#002626] font-medium">{review.listingName}</span>
                    </p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-gray-700 leading-relaxed mb-4">
                  {review.review}
                </p>

                {/* Reply Button */}
                <button className="inline-flex items-center px-4 py-2 bg-red-50 text-[#002626] rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Reply to this review
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mt-12">
        <button className="px-8 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:border-gray-400 hover:shadow-md transition-all">
          Load more reviews
        </button>
      </div>
    </div>
  );
}