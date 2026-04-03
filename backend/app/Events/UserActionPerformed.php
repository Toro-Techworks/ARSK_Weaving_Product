<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast on public Pusher channel "notifications" (Echo: echo.channel('notifications')).
 * No /broadcasting/auth — avoids private-channel auth failures while the dashboard still shows publishes.
 * Payload stays activity-shaped for toasts; subscribe only from trusted UI (super_admin) in this app.
 */
class UserActionPerformed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $message,
        public string $module = 'system',
        public string $action = 'update',
        public ?int $record_id = null,
        public ?int $actor_user_id = null,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('notifications')];
    }

    public function broadcastAs(): string
    {
        return 'UserActionPerformed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'module' => $this->module,
            'action' => $this->action,
            'record_id' => $this->record_id,
            'actor_user_id' => $this->actor_user_id,
        ];
    }
}
