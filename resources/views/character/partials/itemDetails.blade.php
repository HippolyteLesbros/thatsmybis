@if ($item)
    <ul class="no-bullet no-indent small text-muted ml-3">
        <li>
            <ul class="list-inline">
                @if ($item->pivot->is_offspec)
                    <li class="list-inline-item">
                        <span class="font-weight-bold text-white" title="Offspec">OS</span>
                    </li>
                @endif
                @if ((!isset($hideCreatedAt) || !$hideCreatedAt) && $item->pivot->created_at))
                    <li class="cursor-pointer js-timestamp-title list-inline-item" data-timestamp="{{ $item->pivot->created_at }}">
                        added <span class="js-watchable-timestamp" data-timestamp="{{ $item->pivot->created_at }}"></span> ago
                        @if (isset($item->pivot->type) && $item->pivot->type == App\Item::TYPE_RECEIVED)
                            (backdated)
                        @endif
                    </li>
                @endif
                @if (!isset($hideAddedBy) || !$hideAddedBy)
                    <li class="list-inline-item">
                        by
                        <a href="{{ route('member.show', ['guildId' => $guild->id, 'guildSlug' => $guild->slug, 'memberId' => $item->pivot->added_by, 'usernameSlug' => slug($item->added_by_username)]) }}" class="text-muted" target="_blank">
                            {{ $item->added_by_username }}
                        </a>
                        @if ((!isset($hideRaidGroup) || !$hideRaidGroup) && $item->raid_group_name)
                            / {{ $item->raid_group_name }}
                        @endif
                    </li>
                @endif
            </ul>
        </li>
        @if ($item->pivot->note)
            <li>
                <span class="font-weight-medium">Note:</span> {{ $item->pivot->note }}
            </li>
        @endif
        @if (isset($showOfficerNote) && $showOfficerNote && $item->pivot->officer_note)
            <li>
                <span class="font-weight-medium">Officer Note:</span> {{ $item->pivot->officer_note }}
            </li>
        @endif
    </ul>
@endif
