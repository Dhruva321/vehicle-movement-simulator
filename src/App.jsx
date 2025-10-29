import VehicleMap from './VehicleMap.jsx';

export default function App() {
  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 flex flex-col">
      {/* Beautiful Gradient Header */}
      <header className="p-6 text-center bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 drop-shadow-md">
          Vehicle Movement Simulator
        </h1>
        <p className="text-sm sm:text-base opacity-90">
          Simulated Real-Time Vehicle Tracking on an Interactive Map
        </p>
      </header>

      {/* Main Map Container */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="h-full rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden relative">
          <VehicleMap />
        </div>
      </main>
    </div>
  );
}
