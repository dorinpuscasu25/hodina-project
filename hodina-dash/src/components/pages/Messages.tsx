import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, formatApiError } from '@/lib/api';
import type { Booking, BookingMessage } from '@/lib/types';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Acum';
  }

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function Messages() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBookings() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: Booking[] }>('/host/bookings', { token });
      const availableChats = response.data.filter((booking) => booking.chat_enabled);
      const requestedBookingId = Number(searchParams.get('booking') ?? 0);
      const requestedBookingExists = availableChats.some((booking) => booking.id === requestedBookingId);

      setBookings(availableChats);
      setSelectedBookingId((current) => {
        if (requestedBookingExists) {
          return requestedBookingId;
        }

        return current ?? availableChats[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBookings();
  }, [token, searchParams]);

  useEffect(() => {
    if (!selectedBookingId) {
      return;
    }

    setSearchParams({ booking: String(selectedBookingId) }, { replace: true });
  }, [selectedBookingId, setSearchParams]);

  useEffect(() => {
    async function loadMessages() {
      if (!token || !selectedBookingId) {
        setMessages([]);
        return;
      }

      try {
        const response = await apiRequest<{ data: BookingMessage[] }>(
          `/host/bookings/${selectedBookingId}/messages`,
          { token },
        );

        setMessages(response.data);
      } catch (loadError) {
        setError(formatApiError(loadError));
      }
    }

    void loadMessages();
  }, [selectedBookingId, token]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedBookingId || !messageBody.trim()) {
      return;
    }

    setIsSending(true);

    try {
      const response = await apiRequest<{ data: BookingMessage }>(
        `/host/bookings/${selectedBookingId}/messages`,
        {
          token,
          method: 'POST',
          body: { body: messageBody.trim() },
        },
      );

      setMessages((current) => [...current, response.data]);
      setMessageBody('');
    } catch (sendError) {
      setError(formatApiError(sendError));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7e8c83]">Confirmed chats</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Messages</h1>
        <p className="max-w-2xl text-base text-[#64766d]">
          Chatul se deschide doar după confirmarea rezervării. Aici vezi toate conversațiile active cu oaspeții.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#17332d]">Conversații</h2>
          </div>
          {isLoading ? (
            <div className="px-5 py-8 text-sm text-[#6f7d75]">Se încarcă rezervările confirmate...</div>
          ) : bookings.length === 0 ? (
            <div className="px-5 py-8 text-sm text-[#6f7d75]">
              Nu există conversații încă. Chatul apare după confirmarea unei rezervări.
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                  className={`w-full rounded-[1.5rem] px-4 py-4 text-left transition ${
                    selectedBookingId === booking.id ? 'bg-[#17332d] text-white' : 'bg-white text-[#17332d]'
                  }`}
                >
                  <p className="font-semibold">{booking.contact_name}</p>
                  <p className={`mt-1 text-sm ${selectedBookingId === booking.id ? 'text-white/80' : 'text-[#66776d]'}`}>
                    {booking.bookable?.title ?? booking.booking_number}
                  </p>
                  <p className={`mt-2 text-xs ${selectedBookingId === booking.id ? 'text-white/65' : 'text-[#8b9990]'}`}>
                    {formatDateTime(booking.starts_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-[#17332d]">
              {selectedBooking ? selectedBooking.contact_name : 'Alege o conversație'}
            </h2>
            <p className="mt-1 text-sm text-[#697a71]">
              {selectedBooking?.bookable?.title ?? 'Mesajele confirmate ale rezervărilor'}
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-white px-6 py-6">
            {selectedBookingId === null ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[#6d7d74]">
                <MessageCircle className="mb-4 h-12 w-12 text-[#c8bba8]" />
                <p className="text-lg font-semibold text-[#17332d]">Selectează o rezervare confirmată</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-[#687970]">
                Nu există mesaje încă. Poți trimite primul mesaj chiar acum.
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender?.id === user?.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xl rounded-[1.5rem] px-4 py-3 shadow-sm ${
                        isOwn ? 'bg-[#17332d] text-white' : 'bg-white text-[#17332d]'
                      }`}
                    >
                      <p className="text-sm leading-6">{message.body}</p>
                      <p className={`mt-2 text-xs ${isOwn ? 'text-white/70' : 'text-[#83938a]'}`}>
                        {message.sender?.name ?? 'Utilizator'} | {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-3">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                rows={2}
                placeholder="Scrie un mesaj către oaspete..."
                className="min-h-[60px] flex-1 rounded-[1.5rem] border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
              />
              <button
                type="submit"
                disabled={!selectedBookingId || isSending || !messageBody.trim()}
                className="inline-flex h-fit items-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
              >
                <Send className="h-4 w-4" />
                Trimite
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
