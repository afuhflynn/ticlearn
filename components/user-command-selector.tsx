"use client";

import { Loader2, User } from "lucide-react";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUserSearch } from "@/hooks/useUserSearch";

interface UserCommandSelectorProps {
  value: string;
  onChange: (userId: string, userName: string, userEmail: string) => void;
  placeholder?: string;
  selectedUser?: string;
}

export function UserCommandSelector({
  value,
  onChange,
  placeholder = "Search users by name or email...",
  selectedUser,
}: UserCommandSelectorProps) {
  const [inputValue, setInputValue] = React.useState("");

  const { results, isLoading, isFetching, clearSearch, setSearch } =
    useUserSearch(300);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSearch(value); // Trigger the search through the hook
  };

  const handleSelect = (user: {
    id: string;
    name: string | null;
    email: string;
  }) => {
    onChange(user.id, user.name || "Unknown", user.email);
    setInputValue("");
    clearSearch();
  };

  const triggerContent = React.useMemo(() => {
    if (!value || results.length === 0) {
      return <span className="text-muted-foreground">Select a user...</span>;
    }
    const selectedUser = results.find((u) => u.id === value);
    if (selectedUser) {
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>
            {selectedUser.name} ({selectedUser.email})
          </span>
        </div>
      );
    }
    return <span className="text-muted-foreground">Select a user...</span>;
  }, [value, results]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          {!selectedUser && (
            <CommandList className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-background shadow-md">
              {isLoading || isFetching ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 && inputValue.length > 0 ? (
                <CommandEmpty>No users found.</CommandEmpty>
              ) : results.length === 0 ? (
                <CommandEmpty>Start typing to search...</CommandEmpty>
              ) : (
                <CommandGroup heading="Users">
                  {results.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleSelect(user)}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span className="flex-1 truncate">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>
    </div>
  );
}
