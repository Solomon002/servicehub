import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function BarberInvitationPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { configured, loading, user, role } = useAuth();
  const navigate = useNavigate();

  if (!configured) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-5">
        <p className="text-sm text-stone-600">
          Connect your Supabase project before accepting an invitation.
        </p>
      </main>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/login/barber" replace />;
  }

  if (!loading && role === "barber") {
    return <Navigate to="/my-work" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      const { error: invitationError } = await supabase.rpc(
        "accept_barber_invitation",
      );

      if (invitationError) throw invitationError;

      navigate("/my-work", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not finish your invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-5 py-10 text-stone-900">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-900 font-bold text-white">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">
            Service<span className="text-emerald-800">Hub</span>
          </span>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
          Barber invitation
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Create your password
        </h1>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Your invitation has been accepted. Create a password to access your
          barber workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="barber-password"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Password
            </label>
            <input
              id="barber-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              placeholder="At least 10 characters"
            />
          </div>

          <div>
            <label
              htmlFor="barber-confirm-password"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Confirm password
            </label>
            <input
              id="barber-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter the password again"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-60"
          >
            {submitting
              ? "Setting up your account..."
              : "Set password & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default BarberInvitationPage;
