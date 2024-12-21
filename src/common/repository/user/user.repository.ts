import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { String } from 'aws-sdk/clients/cloudhsm';

const prisma = new PrismaClient();

export class UserRepository {
  /**
   * get user by email
   * @param email
   * @returns
   */
  static async getUserByEmail(email: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  /**
   * get user details
   * @returns
   */
  static async getUserDetails(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        role_users: {
          include: {
            role: {
              include: {
                permission_roles: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        project_members: {
          include: {
            role: {
              include: {
                permission_roles: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return user;
  }

  /**
   * Check existance
   * @returns
   */
  static async exist({ field, value }) {
    const model = await prisma.user.findFirst({
      where: {
        [field]: value,
      },
    });
    return model;
  }

  /**
   * Create su admin user
   * @param param0
   * @returns
   */
  static async createSuAdminUser({ username, email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);

      const user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          password: password,
          type: 'su_admin',
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invite user under tenant
   * @param param0
   * @returns
   */
  static async inviteUser({ fname, lname, username, email, role_id }) {
    try {
      const user = await prisma.user.create({
        data: {
          fname: fname,
          lname: lname,
          username: username,
          email: email,
        },
      });
      if (user) {
        // attach role
        const role = await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
        return user;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Attach a role to a user
   * @param param0
   * @returns
   */
  static async attachRole({
    user_id,
    role_id,
  }: {
    user_id: String;
    role_id: String;
  }) {
    const role = await prisma.roleUser.create({
      data: {
        user_id: user_id,
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * update user role
   * @param param0
   * @returns
   */
  static async syncRole({
    user_id,
    role_id,
  }: {
    user_id: string;
    role_id: string;
  }) {
    const role = await prisma.roleUser.updateMany({
      where: {
        AND: [
          {
            user_id: user_id,
          },
        ],
      },
      data: {
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  static async createUser({ username, email, password, role_id = null }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          password: password,
        },
      });
      if (user) {
        if (role_id) {
          // attach role
          const role = await this.attachRole({
            user_id: user.id,
            role_id: role_id,
          });
        }

        return user;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }
}
