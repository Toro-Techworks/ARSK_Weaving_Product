<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Middleware\Authenticate as BaseAuthenticate;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Force HTTPS in production
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Prevent Laravel from redirecting to a non-existent "login" route
        app()->bind(BaseAuthenticate::class, function ($app) {
            return new class($app['auth']) extends BaseAuthenticate {
                protected function redirectTo($request)
                {
                    return null;
                }
            };
        });
    }
}