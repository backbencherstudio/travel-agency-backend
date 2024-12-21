import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectRepository {
  static async createProject(
    user_id: string,
    name: string,
    description?: string,
  ) {
    try {
      const data = {};
      if (name) {
        data['name'] = name;
      }
      if (description) {
        data['description'] = description;
      }

      const project = await prisma.project.create({
        data: {
          ...data,
          user_id,
        },
      });

      if (project) {
        await prisma.projectMember.create({
          data: {
            user_id: user_id,
            project_id: project.id,
            role_id: '2', // admin
          },
        });

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  static async checkProjectExists(project_id: string) {
    const project = await prisma.project.findUnique({
      where: {
        id: project_id,
      },
    });

    if (!project) {
      return false;
    }

    return true;
  }

  static async checkProjectMember(user_id: string, project_id: string) {
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        user_id,
        project_id,
      },
    });

    if (!projectMember) {
      return false;
    }

    return true;
  }
}
