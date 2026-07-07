import { faker } from '@faker-js/faker';
import { User, UserRole } from '../../src/user/user.entity';
import { Product } from '../../src/products/products.entity';
import { Order, OrderStatus } from '../../src/orders/order.entity';
import { jest } from '@jest/globals';

export const createTestUser = (overrides?: Partial<User>): Partial<User> => {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hashedPassword',
    role: UserRole.USER,
    isVerified: true,
    isVendorApproved: false,
    ...overrides,
  };
};

export const createTestVendor = (overrides?: Partial<User>): Partial<User> => {
  return {
    ...createTestUser(),
    role: UserRole.VENDOR,
    isVendorApproved: false,
    vendorBusinessName: faker.company.name(),
    vendorBusinessDescription: faker.company.catchPhrase(),
    vendorPhoneNumber: faker.phone.number(),
    vendorAddress: faker.location.streetAddress(),
    ...overrides,
  };
};

export const createTestProduct = (overrides?: Partial<Product>): Partial<Product> => {
  return {
    title: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price()),
    description: faker.commerce.productDescription(),
    stock: faker.number.int({ min: 1, max: 100 }),
    isActive: true,
    ...overrides,
  };
};

export const createTestOrder = (overrides?: Partial<Order>): Partial<Order> => {
  return {
    total: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
    status: OrderStatus.PENDING,
    ...overrides,
  };
};

export const generateTestToken = (userId: number = 1, role: UserRole = UserRole.USER): string => {
  return `test-token-${userId}-${role}`;
};

export const mockRequest = (user: any) => ({
  user,
  headers: {},
  cookies: {},
  ip: '127.0.0.1',
});

// Explicit interface for the mocked Express Response, rather than letting
// TS infer it from the jest.fn() calls. Without this, declaration emission
// fails because the inferred return type reaches into jest-mock's internal
// (non-portable) types.
export interface MockResponse {
  status: jest.Mock<any>;
  json: jest.Mock<any>;
  send: jest.Mock<any>;
  cookie: jest.Mock<any>;
  clearCookie: jest.Mock<any>;
  [key: string]: any;
}

export const mockResponse = (): MockResponse => {
  const res: MockResponse = {} as MockResponse;
  res.status = jest.fn().mockReturnValue(res) as jest.Mock<any>;
  res.json = jest.fn().mockReturnValue(res) as jest.Mock<any>;
  res.send = jest.fn().mockReturnValue(res) as jest.Mock<any>;
  res.cookie = jest.fn().mockReturnValue(res) as jest.Mock<any>;
  res.clearCookie = jest.fn().mockReturnValue(res) as jest.Mock<any>;
  return res;
};

// Same fix here: explicit interface + explicit return type annotation on
// createMockRepository. This is the actual cause of the "cannot be named
// without a reference to 'UnknownFunction'" error — TS was trying to
// print the fully inferred return type (including nested jest-mock
// internals) into a .d.ts file and failing. An explicit named type sidesteps
// that entirely, since TS just checks the object literal against it instead
// of inferring/printing a structural type.
export interface MockQueryBuilder {
  addSelect: jest.Mock<any>;
  where: jest.Mock<any>;
  andWhere: jest.Mock<any>;
  orWhere: jest.Mock<any>;
  orderBy: jest.Mock<any>;
  getMany: jest.Mock<any>;
  getOne: jest.Mock<any>;
  getManyAndCount: jest.Mock<any>;
  select: jest.Mock<any>;
  leftJoinAndSelect: jest.Mock<any>;
  innerJoinAndSelect: jest.Mock<any>;
}

export interface MockRepository {
  find: jest.Mock<any>;
  findOne: jest.Mock<any>;
  findOneBy: jest.Mock<any>;
  findAndCount: jest.Mock<any>;
  create: jest.Mock<any>;
  save: jest.Mock<any>;
  update: jest.Mock<any>;
  delete: jest.Mock<any>;
  remove: jest.Mock<any>;
  softRemove: jest.Mock<any>;
  recover: jest.Mock<any>;
  count: jest.Mock<any>;
  createQueryBuilder: jest.Mock<any>;
}

export const createMockRepository = (): MockRepository => ({
  find: jest.fn() as jest.Mock<any>,
  findOne: jest.fn() as jest.Mock<any>,
  findOneBy: jest.fn() as jest.Mock<any>,
  findAndCount: jest.fn() as jest.Mock<any>,
  create: jest.fn() as jest.Mock<any>,
  save: jest.fn() as jest.Mock<any>,
  update: jest.fn() as jest.Mock<any>,
  delete: jest.fn() as jest.Mock<any>,
  remove: jest.fn() as jest.Mock<any>,
  softRemove: jest.fn() as jest.Mock<any>,
  recover: jest.fn() as jest.Mock<any>,
  count: jest.fn() as jest.Mock<any>,
  createQueryBuilder: jest.fn(
    (): MockQueryBuilder => ({
      addSelect: jest.fn().mockReturnThis() as jest.Mock<any>,
      where: jest.fn().mockReturnThis() as jest.Mock<any>,
      andWhere: jest.fn().mockReturnThis() as jest.Mock<any>,
      orWhere: jest.fn().mockReturnThis() as jest.Mock<any>,
      orderBy: jest.fn().mockReturnThis() as jest.Mock<any>,
      getMany: jest.fn() as jest.Mock<any>,
      getOne: jest.fn() as jest.Mock<any>,
      getManyAndCount: jest.fn() as jest.Mock<any>,
      select: jest.fn().mockReturnThis() as jest.Mock<any>,
      leftJoinAndSelect: jest.fn().mockReturnThis() as jest.Mock<any>,
      innerJoinAndSelect: jest.fn().mockReturnThis() as jest.Mock<any>,
    }),
  ) as jest.Mock<any>,
});