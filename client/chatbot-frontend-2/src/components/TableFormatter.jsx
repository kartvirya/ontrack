import React from 'react';

const TableFormatter = ({ content }) => {
  // Function to parse markdown table syntax
  const parseTable = (tableText) => {
    const lines = tableText.trim().split('\n');
    
    // Need at least 3 lines for a valid table (header, separator, and at least one row)
    if (lines.length < 3) return null;
    
    // Parse header row
    const headerRow = lines[0].trim().split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // Check if second line is a separator row
    const separatorRow = lines[1].trim();
    if (!separatorRow.includes('|') || !separatorRow.includes('-')) return null;
    
    // Parse data rows
    const dataRows = lines.slice(2).map(line => 
      line.trim().split('|').map(cell => cell.trim()).filter(cell => cell)
    ).filter(row => row.length > 0);
    
    return { headerRow, dataRows };
  };

  // Function to identify and extract tables from content
  const extractTables = (content) => {
    const parts = [];
    let currentPos = 0;
    
    // Simple regex to identify markdown tables
    // This looks for a line starting with optional whitespace, then |, then any characters, then |
    const tableRegex = /^\s*\|.*\|.*\n\s*\|[\s-:|]*\|[\s-:|]*\n\s*\|.*\|/gm;
    
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      // Add text before the table
      if (match.index > currentPos) {
        parts.push({
          type: 'text',
          content: content.substring(currentPos, match.index)
        });
      }
      
      // Add the table
      parts.push({
        type: 'table',
        content: match[0]
      });
      
      currentPos = match.index + match[0].length;
    }
    
    // Add any remaining text after the last table
    if (currentPos < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(currentPos)
      });
    }
    
    return parts;
  };

  // Process the content
  const contentParts = extractTables(content);
  
  return (
    <div className="table-formatter">
      {contentParts.map((part, index) => {
        if (part.type === 'text') {
          return <div key={index}>{part.content}</div>;
        } else if (part.type === 'table') {
          const parsedTable = parseTable(part.content);
          
          if (!parsedTable) {
            return <div key={index}>{part.content}</div>;
          }
          
          return (
            <div key={index} className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-gray-200">
                  <tr>
                    {parsedTable.headerRow.map((header, headerIndex) => (
                      <th 
                        key={headerIndex} 
                        className="border border-gray-300 px-4 py-2 text-left"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedTable.dataRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="border border-gray-300 px-4 py-2"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default TableFormatter;
