import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Save, HelpCircle } from 'lucide-react';
import { validateApiKey } from '../services/youtubeService';

interface SettingsProps {
  onSave: (key: string, persist: boolean) => void;
  initialKey: string;
}

const Settings: React.FC<SettingsProps> = ({ onSave, initialKey }) => {
  const [key, setKey] = useState(initialKey);
  const [saveKey, setSaveKey] = useState(true);
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
      setKey(initialKey);
  }, [initialKey]);

  const handleValidateAndSave = async () => {
    if (!key) return;
    setStatus('validating');
    setErrorMessage(null);

    const { isValid, error } = await validateApiKey(key);

    if (isValid) {
      setStatus('valid');
      onSave(key, saveKey);
    } else {
      setStatus('invalid');
      setErrorMessage(error || "Invalid API Key");
    }
  };

  const handleForceSave = () => {
      onSave(key, saveKey);
  };

  const isBlockedError = errorMessage?.toLowerCase().includes('blocked') || errorMessage?.toLowerCase().includes('access not configured');

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <Key className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">API Configuration</h2>
          <p className="text-sm text-gray-400">Google Cloud API Key required</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            YouTube Data API v3 Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={key}
              onChange={(e) => {
                  setKey(e.target.value);
                  setStatus('idle');
                  setErrorMessage(null);
              }}
              placeholder="AIzaSy..."
              className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${status === 'invalid' ? 'border-red-500' : 'border-gray-700'}`}
            />
            <div className="absolute right-3 top-3">
              {status === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {status === 'invalid' && <AlertCircle className="w-5 h-5 text-red-500" />}
            </div>
          </div>
          {errorMessage && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{errorMessage}</span>
                  </div>

                  {isBlockedError && (
                      <div className="mt-2 pl-6">
                          <p className="text-xs text-red-200 mb-1 font-semibold">Possible Fixes:</p>
                          <ul className="list-disc list-inside text-[10px] text-gray-300 space-y-1 mt-1">
                            <li>
                                <a
                                    href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 underline hover:text-blue-300"
                                >
                                    Enable YouTube Data API v3
                                </a>
                            </li>
                            <li>Check if this Key has <strong>API Restrictions</strong> in the Credentials tab.</li>
                            <li>Wait 2-3 minutes if you just enabled it.</li>
                          </ul>
                      </div>
                  )}
              </div>
          )}
        </div>

        <label className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-900/70 transition-colors">
          <input
            type="checkbox"
            checked={saveKey}
            onChange={(e) => setSaveKey(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
          />
          <div className="flex-1 text-xs text-gray-400">
            <span className="font-medium text-gray-300">Save API Key</span>
            {saveKey && (
              <p className="mt-1 text-[10px] text-yellow-400/80">
                ⚠️ Your key will be stored in browser localStorage. Only enable this on trusted devices. Anyone with access to this browser can use your API quota.
              </p>
            )}
            {!saveKey && (
              <p className="mt-1 text-[10px] text-gray-500">
                Key will only be used for this session. You'll need to re-enter it when you close the tab.
              </p>
            )}
          </div>
        </label>

        <button
          onClick={handleValidateAndSave}
          disabled={status === 'validating' || !key}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            status === 'validating' 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {status === 'validating' ? 'Validating...' : (
              <>
                <Save className="w-4 h-4" />
                Save Key
              </>
          )}
        </button>
        
        {status === 'invalid' && (
            <button 
                onClick={handleForceSave}
                className="w-full text-xs text-gray-500 hover:text-gray-300 underline mt-2 transition-colors"
            >
                Validation failed? Save anyway.
            </button>
        )}

        <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 text-sm text-gray-400">
            <p className="flex items-center gap-2 mb-2 font-medium text-white">
                <HelpCircle className="w-4 h-4" />
                Setup Instructions
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-1 text-xs">
                <li>
                    Go to <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Library</a>.
                </li>
                <li>
                    Click <strong className="text-gray-300">Enable</strong> for "YouTube Data API v3".
                </li>
                <li>
                    Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Credentials</a>.
                </li>
                <li>Use an existing key (ensure no restrictions) or create a new one.</li>
            </ol>
        </div>
      </div>
    </div>
  );
};

export default Settings;