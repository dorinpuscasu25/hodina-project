import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, MessageCircle, Search, Send } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { apiRequest, formatApiError } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatDateTime } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import type { Booking, BookingMessage } from "../types";

interface MessagesPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onRequestAuth: (mode?: "login" | "register") => void;
  selectedBookingId?: number;
  onNotice: (message: string | null) => void;
}

export const MessagesPage = ({
  onNavigate,
  onRequestAuth,
  selectedBookingId,
  onNotice,
}: MessagesPageProps) => {
  const { t } = useLanguage();
  const { isAuthenticated, token, user, resendVerification } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<number | null>(
    selectedBookingId ?? null,
  );
  const [messages, setMessages] = useState<Record<number, BookingMessage[]>>(
    {},
  );
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadBookings = async () => {
    if (!token || !user?.email_verified) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: Booking[] }>(
        "/client/bookings",
        { token },
      );
      const availableConversations = response.data.filter(
        (booking) => booking.chat_enabled,
      );
      setBookings(availableConversations);
      setSelectedBooking(
        (current) => current ?? availableConversations[0]?.id ?? null,
      );
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (bookingId: number) => {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<{ data: BookingMessage[] }>(
        `/client/bookings/${bookingId}/messages`,
        {
          token,
        },
      );

      setMessages((current) => ({
        ...current,
        [bookingId]: response.data,
      }));
    } catch (loadError) {
      setError(formatApiError(loadError));
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [token, user?.email_verified]);

  useEffect(() => {
    if (selectedBooking) {
      void loadMessages(selectedBooking);
    }
  }, [selectedBooking, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedBooking, messages]);

  useEffect(() => {
    if (selectedBookingId) {
      setSelectedBooking(selectedBookingId);
    }
  }, [selectedBookingId]);

  const selectedConversation =
    bookings.find((booking) => booking.id === selectedBooking) ?? null;
  const conversationMessages = selectedBooking
    ? (messages[selectedBooking] ?? [])
    : [];

  useSeo({
    title: "Mesajele mele",
    description:
      "Conversațiile active dintre tine și hostsle la care ai rezervat.",
    canonicalPath: selectedBooking
      ? `/account/messages?booking=${selectedBooking}`
      : "/account/messages",
    noindex: true,
  });

  const filteredBookings = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    if (!needle) {
      return bookings;
    }

    return bookings.filter((booking) =>
      [
        booking.bookable?.title ?? "",
        booking.guesthouse?.name ?? "",
        booking.contact_name ?? "",
        booking.booking_number,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [bookings, searchQuery]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedBooking || !messageText.trim() || !token) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: BookingMessage }>(
        `/client/bookings/${selectedBooking}/messages`,
        {
          token,
          method: "POST",
          body: {
            body: messageText.trim(),
          },
        },
      );

      setMessages((current) => ({
        ...current,
        [selectedBooking]: [...(current[selectedBooking] ?? []), response.data],
      }));
      setMessageText("");
    } catch (sendError) {
      setError(formatApiError(sendError));
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      await resendVerification();
      onNotice("Am retrimis emailul de confirmare.");
    } catch (resendError) {
      setError(formatApiError(resendError));
    } finally {
      setIsResending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-12 shadow-sm">
            <MessageCircle className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-900">
              Intră în cont pentru mesaje
            </h2>
            <button
              onClick={() => onRequestAuth("login")}
              className="mt-6 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white"
            >
              Intră în cont
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.email_verified) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Confirmă emailul pentru a trimite mesaje
            </h2>
            <button
              onClick={() => void handleResend()}
              disabled={isResending}
              className="mt-6 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white disabled:bg-gray-300"
            >
              {isResending ? "Se trimite..." : "Retrimite emailul"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-col border-r border-gray-200 bg-white md:w-96">
          <div className="border-b border-gray-200 p-4">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              {t.messages.title}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.messages.searchPlaceholder}
                className="w-full rounded-full border border-gray-300 py-2 pl-10 pr-4 focus:border-[#002626] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-gray-100"
                  />
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t.messages.noConversations}
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => {
                    setSelectedBooking(booking.id);
                    onNavigate("messages", { bookingId: booking.id });
                  }}
                  className={`w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedBooking === booking.id ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={
                        booking.bookable?.cover_image ??
                        "https://placehold.co/160x160?text=H"
                      }
                      alt={booking.bookable?.title ?? booking.booking_number}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="truncate font-semibold text-gray-900">
                          {booking.guesthouse?.name ??
                            booking.bookable?.title ??
                            booking.booking_number}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(booking.starts_at)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-gray-600">
                        {booking.bookable?.title}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {booking.booking_number}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedConversation ? (
          <div className="hidden flex-1 flex-col md:flex">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.guesthouse?.name ??
                    selectedConversation.bookable?.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedConversation.bookable?.title}
                </p>
              </div>
              <button
                onClick={() =>
                  onNavigate("experience", {
                    id: selectedConversation.bookable?.id,
                    slug: selectedConversation.bookable?.slug,
                    kind:
                      selectedConversation.bookable_type === "Accommodation"
                        ? "accommodation"
                        : "experience",
                  })
                }
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-[#002626]"
              >
                Vezi listarea
              </button>
            </div>

            {error ? (
              <div className="border-b border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  {conversationMessages.map((message) => {
                    const isMine = message.sender?.id === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#002626] text-xs font-semibold text-white">
                          {message.sender?.name?.charAt(0).toUpperCase() ?? "H"}
                        </div>
                        <div className={`${isMine ? "items-end" : ""} flex-1`}>
                          <div
                            className={`inline-block max-w-[70%] rounded-2xl px-4 py-2 ${
                              isMine
                                ? "bg-[#002626] text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p>{message.body}</p>
                          </div>
                          <p className="mt-1 px-2 text-xs text-gray-500">
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="w-80 overflow-y-auto border-l border-gray-200 bg-gray-50">
                <div className="p-4">
                  <h3 className="mb-4 font-semibold text-gray-900">
                    {t.messages.reservation}
                  </h3>
                  <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <img
                      src={
                        selectedConversation.bookable?.cover_image ??
                        "https://placehold.co/800x500?text=Hodina"
                      }
                      alt={
                        selectedConversation.bookable?.title ??
                        selectedConversation.booking_number
                      }
                      className="h-48 w-full object-cover"
                    />
                    <div className="space-y-3 p-4">
                      <h4 className="font-semibold text-gray-900">
                        {selectedConversation.bookable?.title}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDateTime(selectedConversation.starts_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.booking_number}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSendMessage}
              className="border-t border-gray-200 bg-white p-4"
            >
              <div className="mx-auto flex max-w-3xl gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={t.messages.typeMessage}
                  className="flex-1 rounded-full border border-gray-300 px-5 py-3 focus:border-[#002626] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="rounded-full bg-[#002626] p-3 text-white transition-colors hover:bg-[#003838] disabled:bg-gray-300"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center bg-gray-50 md:flex">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-gray-500">
                {t.messages.selectConversationDesc}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
