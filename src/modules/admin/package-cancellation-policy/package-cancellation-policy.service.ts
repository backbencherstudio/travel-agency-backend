import { Injectable } from '@nestjs/common';
import { CreatePackageCancellationPolicyDto } from './dto/create-package-cancellation-policy.dto';
import { UpdatePackageCancellationPolicyDto } from './dto/update-package-cancellation-policy.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PackageCancellationPolicyService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    createPackageCancellationPolicyDto: CreatePackageCancellationPolicyDto,
  ) {
    try {
      const { policy, description } = createPackageCancellationPolicyDto;

      await this.prisma.packageCancellationPolicy.create({
        data: {
          policy,
          description,
        },
      });

      return {
        success: true,
        message: 'Package cancellation policy created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const packageCancellationPolicies =
        await this.prisma.packageCancellationPolicy.findMany({
          select: {
            id: true,
            policy: true,
            description: true,
            created_at: true,
            updated_at: true,
          },
        });

      return {
        success: true,
        data: packageCancellationPolicies,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const packageCancellationPolicy =
        await this.prisma.packageCancellationPolicy.findUnique({
          where: { id: id },
          select: {
            id: true,
            policy: true,
            description: true,
            created_at: true,
            updated_at: true,
          },
        });
      return {
        success: true,
        data: packageCancellationPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(
    id: string,
    updatePackageCancellationPolicyDto: UpdatePackageCancellationPolicyDto,
  ) {
    try {
      const { policy, description } = updatePackageCancellationPolicyDto;

      const data: any = {};

      if (policy) data.policy = policy;
      if (description) data.description = description;

      await this.prisma.packageCancellationPolicy.update({
        where: { id: id },
        data: data,
      });
      return {
        success: true,
        message: 'Package cancellation policy updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.packageCancellationPolicy.delete({
        where: { id: id },
      });
      return {
        success: true,
        message: 'Package cancellation policy deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
