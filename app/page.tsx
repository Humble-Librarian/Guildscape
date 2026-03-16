import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-24">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold font-sans text-primary">
            GitHub Visualizer
          </h1>
          <p className="text-lg text-secondary">
            A beautiful, dark-minimal summary of any public GitHub activity.
          </p>
        </div>
        <SearchBar />
      </div>
    </main>
  );
}
