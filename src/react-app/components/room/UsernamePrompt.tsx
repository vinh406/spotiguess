import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface UsernamePromptProps {
  roomName: string;
  onSubmit: (username: string) => void;
  onBack: () => void;
}

export function UsernamePrompt({ roomName, onSubmit, onBack }: UsernamePromptProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-700/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Join <span className="text-green-400">#{roomName}</span>
          </h1>
          <p className="text-gray-400">
            Enter your username to join this game room
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const username = formData.get("username") as string;
            if (username?.trim()) {
              onSubmit(username.trim());
            }
          }}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <Input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username..."
              maxLength={20}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onBack}
              className="flex-1"
            >
              Back to Home
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Join #{roomName}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
