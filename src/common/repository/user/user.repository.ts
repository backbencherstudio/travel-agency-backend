import * as bcrypt from 'bcrypt';
import { PrismaClient, User } from '@prisma/client';
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

  // email varification
  static async verifyEmail({ email }) {
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
  static async inviteUser({ name, username, email, role_id }) {
    try {
      const user = await prisma.user.create({
        data: {
          name: name,
          username: username,
          email: email,
        },
      });
      if (user) {
        // attach role
        await this.attachRole({
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
  static async createUser({
    name,
    email,
    password,
    role_id = null,
  }): Promise<User> {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await prisma.user.create({
        data: {
          name: name,
          email: email,
          password: password,
        },
      });
      if (user) {
        if (role_id) {
          // attach role
          await this.attachRole({
            user_id: user.id,
            role_id: role_id,
          });
        }

        return user;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  // change password
  static async changePassword({ email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: password,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // change email
  static async changeEmail({ user_id, new_email }) {
    try {
      const user = await prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          email: new_email,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // validate password
  static async validatePassword({ email, password }) {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } else {
      return false;
    }
  }
}
