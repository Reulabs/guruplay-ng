import { FormEvent, useEffect, useState } from 'react';
import { AuthMode, useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAppError } from '@/lib/errors';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess?: () => void;
}

const AuthForm = ({ mode, onModeChange, onSuccess }: AuthFormProps) => {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupStep, setSignupStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSignup = mode === 'signup';
  const stepLabels = ['Account', 'Profile'];

  useEffect(() => {
    setSignupStep(0);
    setErrorCode(null);
    setErrorMessage(null);
  }, [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setErrorMessage(null);

    if (isSignup && signupStep === 0) {
      if (password !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Check both password fields and try again.',
        });
        setErrorCode('PASSWORDS_DO_NOT_MATCH');
        setErrorMessage('Check both password fields and try again.');
        return;
      }

      setSignupStep(1);
      return;
    }

    if (isSignup && password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Check both password fields and try again.',
      });
      setErrorCode('PASSWORDS_DO_NOT_MATCH');
      setErrorMessage('Check both password fields and try again.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        await signup({
          email,
          password,
          displayName,
          dateOfBirth,
          gender,
        });
      } else {
        await login(email, password);
      }

      toast({
        title: isSignup ? 'Account created' : 'Logged in',
        description: isSignup ? 'Your Guruplay account is ready.' : 'Welcome back to Guruplay.',
      });
      onSuccess?.();
    } catch (error) {
      const appError = getAppError(error);
      setErrorCode(appError.code);
      setErrorMessage(appError.message);
      toast({
        title: isSignup ? 'Could not create account' : 'Could not log in',
        description: `${appError.code}: ${appError.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignup && (
        <div className="grid grid-cols-2 gap-2">
          {stepLabels.map((label, index) => (
            <div key={label} className="space-y-2">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  index <= signupStep ? 'bg-primary' : 'bg-white/15'
                )}
              />
              <p className={cn('text-xs font-semibold', index === signupStep ? 'text-white' : 'text-muted-foreground')}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {errorCode && errorMessage && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertTitle>{errorCode}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {(!isSignup || signupStep === 0) && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-email`}>Email address</Label>
            <Input
              id={`${mode}-email`}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-[#121212] border-[#3a3a3a] focus:border-foreground"
              required
            />
          </div>

          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="signup-display-name">Display name</Label>
              <Input
                id="signup-display-name"
                type="text"
                placeholder="What should we call you?"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="bg-[#121212] border-[#3a3a3a] focus:border-foreground"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${mode}-password`}>Password</Label>
            <Input
              id={`${mode}-password`}
              type="password"
              placeholder={isSignup ? 'Create a password' : 'Enter your password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-[#121212] border-[#3a3a3a] focus:border-foreground"
              required
            />
          </div>

          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm password</Label>
              <Input
                id="signup-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="bg-[#121212] border-[#3a3a3a] focus:border-foreground"
                required
              />
            </div>
          )}
        </>
      )}

      {isSignup && signupStep === 1 && (
        <>
          <div className="space-y-2">
            <Label htmlFor="signup-date-of-birth">Date of birth</Label>
            <Input
              id="signup-date-of-birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              className="bg-[#121212] border-[#3a3a3a] focus:border-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-gender">Gender</Label>
            <select
              id="signup-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="flex h-10 w-full rounded-md border border-[#3a3a3a] bg-[#121212] px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="" disabled>
                Select gender
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </>
      )}

      <div className="flex gap-2">
        {isSignup && signupStep === 1 && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-full font-semibold"
            onClick={() => setSignupStep(0)}
            disabled={isLoading}
          >
            Back
          </Button>
        )}
        <Button type="submit" className="flex-1 rounded-full font-semibold" disabled={isLoading}>
          {isLoading ? 'Please wait...' : isSignup && signupStep === 0 ? 'Continue' : isSignup ? 'Create account' : 'Log in'}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
          className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
        >
          {isSignup ? 'Log in' : 'Sign up'}
        </button>
      </p>
    </form>
  );
};

export default AuthForm;
