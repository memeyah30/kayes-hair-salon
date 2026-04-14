<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Set Up Password</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #e9e2ff, #d8ccff);
            color: #2d2d2d;
        }
        .card {
            width: 100%;
            max-width: 480px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 18px 40px rgba(91, 60, 196, 0.15);
            padding: 32px;
        }
        h1 {
            margin: 0 0 10px;
            font-size: 30px;
        }
        p {
            margin: 0 0 18px;
            line-height: 1.6;
            color: #5f5f74;
        }
        label {
            display: block;
            margin: 0 0 8px;
            font-weight: 600;
        }
        input {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #d8ccff;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 16px;
            font-size: 15px;
        }
        input:focus {
            outline: none;
            border-color: #7b5cf5;
            box-shadow: 0 0 0 4px rgba(123, 92, 245, 0.14);
        }
        .button {
            width: 100%;
            border: 0;
            border-radius: 10px;
            padding: 12px 16px;
            background: #6d4de6;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .button:hover {
            background: #5b3cc4;
        }
        .meta {
            font-size: 14px;
            color: #6b6b6b;
        }
        .alert {
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 18px;
            font-size: 14px;
        }
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
        }
        .alert-info {
            background: #f2edff;
            color: #4c1d95;
        }
        .field {
            margin-bottom: 16px;
        }
        .input-wrap {
            position: relative;
        }
        .input-wrap input {
            margin-bottom: 0;
            padding-right: 76px;
        }
        .toggle-visibility {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            border: 0;
            background: transparent;
            color: #6d4de6;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 8px;
        }
        .toggle-visibility:hover {
            background: #f2edff;
        }
        .helper {
            margin-top: 8px;
            margin-bottom: 0;
            font-size: 13px;
            color: #7a6aa7;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Create Password</h1>

        @if ($email)
            <p class="meta">Setting up account for {{ $email }}</p>
        @endif

        @if ($message)
            <div class="alert alert-error">{{ $message }}</div>
        @endif

        @if ($errors->any())
            <div class="alert alert-error">
                {{ $errors->first() }}
            </div>
        @endif

        @if (!$expired)
            <div class="alert alert-info">
                Create your password below. This link is valid for 24 hours and can only be used once.
            </div>

            <form method="POST" action="{{ route('password.setup.store') }}">
                @csrf
                <input type="hidden" name="token" value="{{ $token }}">

                <div class="field">
                    <label for="password">Create Password</label>
                    <div class="input-wrap">
                        <input id="password" name="password" type="password" minlength="8" required>
                        <button class="toggle-visibility" type="button" data-target="password">Show</button>
                    </div>
                </div>

                <div class="field">
                    <label for="password_confirmation">Confirm Password</label>
                    <div class="input-wrap">
                        <input id="password_confirmation" name="password_confirmation" type="password" minlength="8" required>
                        <button class="toggle-visibility" type="button" data-target="password_confirmation">Show</button>
                    </div>
                    <p class="helper">Use the show buttons if you want to double-check what you typed.</p>
                </div>

                <button class="button" type="submit">Save Password</button>
            </form>
        @endif
    </div>
    <script>
        document.querySelectorAll('.toggle-visibility').forEach(function (button) {
            button.addEventListener('click', function () {
                var input = document.getElementById(button.dataset.target);
                if (!input) return;

                var showing = input.type === 'text';
                input.type = showing ? 'password' : 'text';
                button.textContent = showing ? 'Show' : 'Hide';
            });
        });
    </script>
</body>
</html>
