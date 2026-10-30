import { EmptyState } from "@/ui";

/** Shown instead of the app while .env.local has no Firebase config. */
const FirebaseSetupNotice = () => (
  <div className="min-h-screen flex align-items-center justify-content-center p-3">
    <div className="app-card p-4 max-w-30rem">
      <EmptyState icon="Warning" title="Firebase не налаштовано">
        <p className="m-0 line-height-3">
          Скопіюйте <code>.env.example</code> у <code>.env.local</code>,
          заповніть значення з Firebase console і перезапустіть{" "}
          <code>npm run dev</code>. Кроки описані в README.md.
        </p>
      </EmptyState>
    </div>
  </div>
);

export default FirebaseSetupNotice;
