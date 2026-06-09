resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# --- PUBLIC SUBNETS ---
resource "aws_subnet" "public" {
  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

# --- PRIVATE SUBNETS ---
resource "aws_subnet" "frontend" {
  count             = length(var.frontend_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.frontend_subnets[count.index]
  availability_zone = var.azs[count.index]
  tags = {
    Name = "${var.project_name}-private-frontend-${count.index + 1}"
  }
}

resource "aws_subnet" "backend" {
  count             = length(var.backend_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.backend_subnets[count.index]
  availability_zone = var.azs[count.index]
  tags = {
    Name = "${var.project_name}-private-backend-${count.index + 1}"
  }
}

resource "aws_subnet" "db" {
  count             = length(var.db_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.db_subnets[count.index]
  availability_zone = var.azs[count.index]
  tags = {
    Name = "${var.project_name}-private-db-${count.index + 1}"
  }
}

# --- INTERNET GATEWAY ---
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "${var.project_name}-igw"
  }
}

# --- ELASTIC IP & NAT GATEWAY ---
resource "aws_eip" "nat" {
  count  = length(var.public_subnets) > 0 ? 1 : 0
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  count         = length(var.public_subnets) > 0 ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags = {
    Name = "${var.project_name}-nat"
  }
}

# --- ROUTE TABLES ---
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  count  = length(var.public_subnets) > 0 ? 1 : 0
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[0].id
  }
  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

# --- ROUTE TABLE ASSOCIATIONS ---
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "frontend" {
  count          = length(var.frontend_subnets)
  subnet_id      = aws_subnet.frontend[count.index].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_route_table_association" "backend" {
  count          = length(var.backend_subnets)
  subnet_id      = aws_subnet.backend[count.index].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_route_table_association" "db" {
  count          = length(var.db_subnets)
  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.private[0].id
}
