import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center justify-center text-center">
          {/* 404 Number */}
          <div className="mb-6">
            <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-foreground-secondary max-w-md mx-auto">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          {/* Action Button */}
          <Link
            href="/"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}

