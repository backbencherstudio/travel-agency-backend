import { AbilityBuilder, ExtractSubjectType, PureAbility } from '@casl/ability';
import { createPrismaAbility, Subjects, PrismaQuery } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { User, Role, Project, Task, Comment } from '@prisma/client';

export enum Action {
  Manage = 'manage', // wildcard for any action
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Show = 'show',
  Delete = 'delete',
  Assign = 'assign',
}

export type AppSubjects = Subjects<{
  Tenant: User;
  User: User;
  Role: Role;
  Project: Project;
  Task: Task;
  Comment: Comment;
  Example: User;
}>;

type AppAbility = PureAbility<[string, AppSubjects], PrismaQuery>;

function doCan(can, permissionRoles) {
  const action = permissionRoles.permission.action;
  const subject = permissionRoles.permission.subject;

  can(Action[action], subject);
}
@Injectable()
export class AbilityFactory {
  defineAbility(user, project_wise = true) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createPrismaAbility,
    );

    if (user) {
      if (project_wise) {
        // project wise permissions
        // for (const permissionRoles of user.project_members[0].role
        //   .permission_roles) {
        //   doCan(can, permissionRoles);
        // }
        for (const permissionRoles of user.project_members) {
          for (const permissionRole of permissionRoles.role.permission_roles) {
            doCan(can, permissionRole);
          }
        }
      } else {
        // global permissions
        // for (const permissionRoles of user.role_users[0].role
        //   .permission_roles) {
        //   doCan(can, permissionRoles);
        // }
        for (const permissionRoles of user.role_users) {
          for (const permissionRole of permissionRoles.role.permission_roles) {
            doCan(can, permissionRole);
          }
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<AppAbility>,
    });
  }
}
