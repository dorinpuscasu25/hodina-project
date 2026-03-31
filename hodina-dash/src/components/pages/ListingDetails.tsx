import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Star,
    Calendar,
    Users,
    MapPin,
    Clock,
    DollarSign,
    Edit,
    Eye,
    Heart,
    Share2,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    User,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

export default function ListingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Mock data - în realitate ar veni din API
    const listing = {
        id: '1',
        title: 'Tur ghidat prin Chișinău',
        shortDescription: 'Descoperă frumusețea capitalei Moldovei într-un tur ghidat de 3 ore',
        description: 'Alătură-te nouă pentru o experiență de neuitat prin centrul istoric al Chișinăului. Vei descoperi cele mai importante obiective turistice, vei afla povești fascinante despre istoria orașului și vei gusta din cultura locală. Turul include vizite la Catedrala Națională, Parcul Central, Piața Marii Adunări Naționale și multe altele.',
        category: 'Cultural & Historical',
        location: 'Centrul Chișinăului',
        address: 'Piața Marii Adunări Naționale, Chișinău',
        city: 'Chișinău',
        country: 'Moldova',
        duration: 3,
        maxPersons: 15,
        minAge: 12,
        difficulty: 'easy',
        price: 250,
        currency: 'MDL',
        priceType: 'per_person',
        startTime: '10:00',
        endTime: '13:00',
        availableDays: ['monday', 'wednesday', 'friday', 'saturday'],
        isInstantBook: true,
        images: [
            'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/1133957/pexels-photo-1133957.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        coverImage: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
        status: 'published',
        isActive: true,
        isFeatured: true,
        viewsCount: 1247,
        bookingsCount: 89,
        averageRating: 4.8,
        reviewsCount: 34,
        includedItems: ['Ghid profesionist', 'Hartă turistică', 'Apă minerală', 'Fotografii digitale'],
        notIncludedItems: ['Transport', 'Mâncare', 'Suveniruri'],
        whatToBring: ['Încălțăminte comodă', 'Cameră foto', 'Umbrela (dacă e nevoie)'],
        cancellationPolicy: 'Anulare gratuită cu 24 ore înainte. Pentru anulări în ultimul moment se percepe 50% din preț.',
        importantNotes: 'Turul se desfășoară indiferent de vreme. În caz de ploi torențiale, turul poate fi reprogramat.',
        amenities: ['transport', 'guide', 'photos', 'water'],
        createdAt: '2024-12-15T10:00:00Z',
        updatedAt: '2025-01-10T15:30:00Z'
    };

    const reviews = [
        {
            id: '1',
            guestName: 'Maria Popescu',
            guestAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
            rating: 5,
            date: '2025-01-08',
            comment: 'O experiență fantastică! Ghidul a fost foarte priceput și plin de energie. Am aflat multe lucruri noi despre Chișinău și am făcut fotografii minunate. Recomand cu căldură!',
            helpful: 12
        },
        {
            id: '2',
            guestName: 'Ion Georgescu',
            guestAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
            rating: 4,
            date: '2025-01-05',
            comment: 'Tur foarte interesant și bine organizat. Singura problemă a fost că a durat puțin mai mult decât era programat, dar în rest totul a fost perfect.',
            helpful: 8
        },
        {
            id: '3',
            guestName: 'Ana Dumitrescu',
            guestAvatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100',
            rating: 5,
            date: '2025-01-02',
            comment: 'Cea mai bună experiență turistică din Chișinău! Ghidul știa foarte multe povești interesante și locurile vizitate au fost alese perfect. Mulțumesc!',
            helpful: 15
        }
    ];

    const bookings = [
        {
            id: '1',
            guestName: 'Andrei Moraru',
            guestEmail: 'andrei@email.com',
            date: '2025-01-25',
            time: '10:00',
            persons: 2,
            totalPrice: 500,
            status: 'confirmed',
            bookingDate: '2025-01-15T14:30:00Z',
            specialRequests: 'Vorbim doar română, vă rog să țineți cont.'
        },
        {
            id: '2',
            guestName: 'Elena Radu',
            guestEmail: 'elena@email.com',
            date: '2025-01-28',
            time: '10:00',
            persons: 4,
            totalPrice: 1000,
            status: 'pending',
            bookingDate: '2025-01-18T09:15:00Z',
            specialRequests: ''
        },
        {
            id: '3',
            guestName: 'Mihai Ciobanu',
            guestEmail: 'mihai@email.com',
            date: '2025-01-20',
            time: '10:00',
            persons: 1,
            totalPrice: 250,
            status: 'completed',
            bookingDate: '2025-01-10T16:45:00Z',
            specialRequests: 'Sunt fotograf, aș dori să fac fotografii profesionale.'
        },
        {
            id: '4',
            guestName: 'Cristina Popa',
            guestEmail: 'cristina@email.com',
            date: '2025-01-15',
            time: '10:00',
            persons: 3,
            totalPrice: 750,
            status: 'cancelled',
            bookingDate: '2025-01-05T11:20:00Z',
            specialRequests: ''
        }
    ];

    const tabs = [
        { id: 'overview', label: 'Prezentare generală', count: null },
        { id: 'reviews', label: 'Recenzii', count: listing.reviewsCount },
        { id: 'bookings', label: 'Rezervări', count: bookings.filter(b => b.status !== 'cancelled').length },
        { id: 'history', label: 'Istoric', count: null }
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle className="h-4 w-4" />;
            case 'pending':
                return <AlertCircle className="h-4 w-4" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'Confirmată';
            case 'pending':
                return 'În așteptare';
            case 'completed':
                return 'Finalizată';
            case 'cancelled':
                return 'Anulată';
            default:
                return status;
        }
    };

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 0; i < 5; i++) {
            stars.push(
                <Star
                    key={i}
                    className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
            );
        }
        return stars;
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    };

    const renderOverview = () => (
        <div className="space-y-8">
            {/* Image Gallery */}
            <div className="relative">
                <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden">
                    <img
                        src={listing.images[currentImageIndex]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                    />
                    {listing.images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {listing.images.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{listing.title}</h2>
                        <p className="text-gray-600 mb-4">{listing.shortDescription}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                  {listing.location}
              </span>
                            <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                                {listing.duration} ore
              </span>
                            <span className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Max {listing.maxPersons} persoane
              </span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Descriere</h3>
                        <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Ce este inclus</h4>
                            <ul className="space-y-2">
                                {listing.includedItems.map((item, index) => (
                                    <li key={index} className="flex items-center text-sm text-gray-700">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Ce să aduci</h4>
                            <ul className="space-y-2">
                                {listing.whatToBring.map((item, index) => (
                                    <li key={index} className="flex items-center text-sm text-gray-700">
                                        <AlertCircle className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Stats Sidebar */}
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Statistici</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Vizualizări</span>
                                <span className="font-semibold">{listing.viewsCount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Rezervări</span>
                                <span className="font-semibold">{listing.bookingsCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Rating mediu</span>
                                <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    <span className="font-semibold">{listing.averageRating}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Recenzii</span>
                                <span className="font-semibold">{listing.reviewsCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Preț</h3>
                        <div className="text-3xl font-bold text-[#002626] mb-2">
                            {listing.price} {listing.currency}
                        </div>
                        <div className="text-sm text-gray-600">
                            {listing.priceType === 'per_person' ? 'per persoană' : 'per grup'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReviews = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                    Recenzii ({listing.reviewsCount})
                </h2>
                <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">{listing.averageRating}</span>
                    <span className="text-gray-500">din 5</span>
                </div>
            </div>

            <div className="space-y-6">
                {reviews.map((review) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-start space-x-4">
                            <img
                                src={review.guestAvatar}
                                alt={review.guestName}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{review.guestName}</h4>
                                        <p className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString('ro-RO')}</p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {renderStars(review.rating)}
                                    </div>
                                </div>
                                <p className="text-gray-700 mb-3">{review.comment}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <button className="flex items-center space-x-1 hover:text-gray-700">
                                        <Heart className="h-4 w-4" />
                                        <span>Util ({review.helpful})</span>
                                    </button>
                                    <button className="hover:text-gray-700">Răspunde</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderBookings = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Rezervări</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="font-semibold">{bookings.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-900">
                        {bookings.filter(b => b.status === 'confirmed').length}
                    </div>
                    <div className="text-sm text-green-700">Confirmate</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-900">
                        {bookings.filter(b => b.status === 'pending').length}
                    </div>
                    <div className="text-sm text-yellow-700">În așteptare</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-900">
                        {bookings.filter(b => b.status === 'completed').length}
                    </div>
                    <div className="text-sm text-blue-700">Finalizate</div>
                </div>
            </div>

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{booking.guestName}</h4>
                                    <p className="text-sm text-gray-600">{booking.guestEmail}</p>
                                </div>
                            </div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1">{getStatusLabel(booking.status)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <span className="text-sm text-gray-500">Data</span>
                                <div className="font-medium">{new Date(booking.date).toLocaleDateString('ro-RO')}</div>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500">Ora</span>
                                <div className="font-medium">{booking.time}</div>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500">Persoane</span>
                                <div className="font-medium">{booking.persons}</div>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500">Total</span>
                                <div className="font-medium">{booking.totalPrice} {listing.currency}</div>
                            </div>
                        </div>

                        {booking.specialRequests && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <span className="text-sm font-medium text-gray-700">Cerințe speciale:</span>
                                <p className="text-sm text-gray-600 mt-1">{booking.specialRequests}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                Rezervat pe {new Date(booking.bookingDate).toLocaleDateString('ro-RO')}
              </span>
                            <div className="flex items-center space-x-2">
                                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                    Contactează
                                </button>
                                <button className="px-3 py-1 text-sm bg-[#002626] text-white rounded-lg hover:bg-[#003333] transition-colors">
                                    Detalii
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderHistory = () => (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Istoric activitate</h2>

            <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Experiența a fost publicată</span>
                        <span className="text-sm text-gray-500">15 decembrie 2024</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-5">Experiența a devenit vizibilă pentru public și poate primi rezervări.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Prima rezervare confirmată</span>
                        <span className="text-sm text-gray-500">18 decembrie 2024</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-5">Mihai Ciobanu a rezervat pentru 1 persoană pe 20 ianuarie 2025.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Actualizare preț</span>
                        <span className="text-sm text-gray-500">10 ianuarie 2025</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-5">Prețul a fost actualizat de la 200 MDL la 250 MDL per persoană.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Experiența marcată ca featured</span>
                        <span className="text-sm text-gray-500">12 ianuarie 2025</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-5">Experiența a fost promovată și apare în secțiunea featured.</p>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'reviews':
                return renderReviews();
            case 'bookings':
                return renderBookings();
            case 'history':
                return renderHistory();
            default:
                return renderOverview();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate('/dashboard/listings')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>Înapoi la listinguri</span>
                        </button>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Eye className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{listing.viewsCount} vizualizări</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                                    <Share2 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                                    <Edit className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            <div className="bg-green-50 border-b border-green-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-800 font-medium">Publicată și activă</span>
                        <span className="text-green-600">•</span>
                        <span className="text-green-700">Rezervări instant activate</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-[#002626] text-[#002626]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {tab.count !== null && (
                                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </div>
        </div>
    );
}
