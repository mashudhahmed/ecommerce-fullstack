// src/analytics/export.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async exportData(
    data: any[],
    format: 'excel' | 'pdf' | 'csv' | 'json',
    options: {
      title?: string;
      subtitle?: string;
      filename?: string;
      columns?: { header: string; key: string; width?: number }[];
    } = {},
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    switch (format) {
      case 'excel':
        return this.exportToExcel(data, options);
      case 'pdf':
        return this.exportToPDF(data, options);
      case 'csv':
        return this.exportToCSV(data, options);
      case 'json':
        return this.exportToJSON(data, options);
      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  async exportToExcel(
    data: any[],
    options: {
      filename?: string;
      sheetName?: string;
      columns?: { header: string; key: string; width?: number }[];
    } = {},
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1');

      if (options.columns) {
        worksheet.columns = options.columns.map((col) => ({
          header: col.header,
          key: col.key,
          width: col.width || 20,
        }));
      } else if (data.length > 0) {
        const headers = Object.keys(data[0]);
        worksheet.columns = headers.map((key) => ({
          header: key,
          key,
          width: 20,
        }));
      }

      data.forEach((row) => {
        worksheet.addRow(row);
      });

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' },
      };

      const buffer = await workbook.xlsx.writeBuffer();

      return {
        buffer: Buffer.from(buffer),
        filename: options.filename || `export_${Date.now()}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to export to Excel:', message);
      throw new BadRequestException('Failed to export data to Excel');
    }
  }

  async exportToPDF(
    data: any[],
    options: {
      title?: string;
      subtitle?: string;
      columns?: { header: string; key: string; width?: number }[];
      filename?: string;
    } = {},
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return new Promise((resolve, reject) => {
      try {
        // Import PDFDocument properly
        const PDFDocumentModule = PDFDocument as any;
        const doc = new PDFDocumentModule({
          margin: 50,
          size: 'A4',
          layout: 'landscape',
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            filename: options.filename || `export_${Date.now()}.pdf`,
            contentType: 'application/pdf',
          });
        });
        doc.on('error', reject);

        // Add title
        if (options.title) {
          doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .text(options.title, { align: 'center' });
          doc.moveDown(0.5);
        }

        // Add subtitle
        if (options.subtitle) {
          doc
            .fontSize(14)
            .font('Helvetica')
            .text(options.subtitle, { align: 'center' });
          doc.moveDown(0.5);
        }

        // Add generated date
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        if (data.length === 0) {
          doc.fontSize(14).text('No data available', { align: 'center' });
          doc.end();
          return;
        }

        // Determine columns
        const columns =
          options.columns || Object.keys(data[0]).map((key) => ({
            header: key,
            key,
          }));

        const columnCount = columns.length;
        const colWidth = (doc.page.width - 100) / columnCount;

        // Draw table
        let y = doc.y + 20;
        const startX = 50;

        // Draw headers
        doc.font('Helvetica-Bold').fontSize(10);
        columns.forEach((col, index) => {
          const x = startX + index * colWidth;
          doc.text(col.header, x, y, { width: colWidth - 5, align: 'center' });
        });

        y += 20;
        doc.font('Helvetica').fontSize(9);

        data.forEach((row) => {
          columns.forEach((col, index) => {
            const x = startX + index * colWidth;
            const value = row[col.key] !== undefined ? String(row[col.key]) : '';
            doc.text(value, x, y, { width: colWidth - 5, align: 'left' });
          });
          y += 20;

          // Add new page if needed
          if (y > doc.page.height - 50) {
            doc.addPage();
            y = 50;
          }
        });

        doc.end();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to export to PDF:', message);
        reject(new BadRequestException('Failed to export data to PDF'));
      }
    });
  }

  async exportToCSV(
    data: any[],
    options: {
      filename?: string;
      columns?: { header: string; key: string }[];
    } = {},
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    try {
      if (data.length === 0) {
        return {
          buffer: Buffer.from(''),
          filename: options.filename || `export_${Date.now()}.csv`,
          contentType: 'text/csv',
        };
      }

      const columns =
        options.columns || Object.keys(data[0]).map((key) => ({
          header: key,
          key,
        }));

      const headerRow = columns.map((col) => `"${col.header}"`).join(',');
      const rows = data.map((row) =>
        columns
          .map((col) => {
            const value = row[col.key] !== undefined ? String(row[col.key]) : '';
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(','),
      );

      const csvContent = [headerRow, ...rows].join('\n');

      return {
        buffer: Buffer.from(csvContent, 'utf-8'),
        filename: options.filename || `export_${Date.now()}.csv`,
        contentType: 'text/csv',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to export to CSV:', message);
      throw new BadRequestException('Failed to export data to CSV');
    }
  }

  async exportToJSON(
    data: any[],
    options: {
      filename?: string;
      pretty?: boolean;
    } = {},
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    try {
      const jsonString = options.pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      return {
        buffer: Buffer.from(jsonString, 'utf-8'),
        filename: options.filename || `export_${Date.now()}.json`,
        contentType: 'application/json',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to export to JSON:', message);
      throw new BadRequestException('Failed to export data to JSON');
    }
  }

  async downloadFile(
    result: { buffer: Buffer; filename: string; contentType: string },
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.send(result.buffer);
  }
}