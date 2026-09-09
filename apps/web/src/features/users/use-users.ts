import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Permission } from '@osgb/shared-types';
import { rolesService, usersService } from '@/services/users.service';
import type { CreateUserInput, RoleInput, UpdateUserInput } from '@/types/user';

export const userKeys = {
  all: ['users'] as const,
  list: (query: { page?: number; pageSize?: number; search?: string }) =>
    ['users', 'list', query] as const,
};
export const roleKeys = { all: ['roles'] as const };

export function useUsers(
  query: { page?: number; pageSize?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => usersService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: roleKeys.all,
    queryFn: () => rolesService.list(),
    staleTime: 60_000,
    enabled,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
    void queryClient.invalidateQueries({ queryKey: roleKeys.all }); // user counts
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateUserInput) => usersService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
        usersService.update(id, input),
      onSuccess: invalidate,
    }),
    assignRoles: useMutation({
      mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
        usersService.assignRoles(id, roleIds),
      onSuccess: invalidate,
    }),
    setPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password: string }) =>
        usersService.setPassword(id, password),
    }),
  };
}

export function useRoleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: roleKeys.all });
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
  return {
    create: useMutation({
      mutationFn: (input: RoleInput) => rolesService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Pick<RoleInput, 'name' | 'description'> }) =>
        rolesService.update(id, input),
      onSuccess: invalidate,
    }),
    setPermissions: useMutation({
      mutationFn: ({ id, permissions }: { id: string; permissions: Permission[] }) =>
        rolesService.setPermissions(id, permissions),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => rolesService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
