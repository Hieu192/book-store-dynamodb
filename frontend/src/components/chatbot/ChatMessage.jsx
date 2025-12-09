import React from 'react';
import { Box, Typography, Avatar, Chip, Tooltip } from '@mui/material';
import {
    Person as PersonIcon,
    SmartToy as BotIcon,
    Source as SourceIcon
} from '@mui/icons-material';

const ChatMessage = ({ message }) => {
    const isBot = message.sender === 'bot';
    const timestamp = new Date(message.timestamp);

    // Format time as HH:MM
    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: isBot ? 'row' : 'row-reverse',
                gap: 1,
                alignItems: 'flex-start',
            }}
        >
            {/* Avatar */}
            <Avatar
                sx={{
                    bgcolor: isBot ? 'primary.main' : 'secondary.main',
                    width: 36,
                    height: 36,
                }}
            >
                {isBot ? <BotIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
            </Avatar>

            {/* Message Content */}
            <Box
                sx={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                }}
            >
                {/* Message Bubble */}
                <Box
                    sx={{
                        bgcolor: isBot ? 'white' : 'primary.main',
                        color: isBot ? 'text.primary' : 'white',
                        px: 2,
                        py: 1.5,
                        borderRadius: isBot ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
                        boxShadow: 1,
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {message.content}
                    </Typography>
                </Box>

                {/* Metadata */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        px: 1,
                        flexDirection: isBot ? 'row' : 'row-reverse',
                    }}
                >
                    {/* Timestamp */}
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                        }}
                    >
                        {formatTime(timestamp)}
                    </Typography>

                    {/* Sources (only for bot messages) */}
                    {isBot && message.sources && message.sources.length > 0 && (
                        <Tooltip
                            title={
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        Nguồn tham khảo:
                                    </Typography>
                                    {message.sources.map((source, index) => (
                                        <Typography key={index} variant="caption" sx={{ display: 'block' }}>
                                            • {source.uri?.split('/').pop() || 'Document ' + (index + 1)}
                                        </Typography>
                                    ))}
                                </Box>
                            }
                            placement="top"
                        >
                            <Chip
                                icon={<SourceIcon sx={{ fontSize: 14 }} />}
                                label={message.sources.length}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    '& .MuiChip-icon': {
                                        fontSize: 14,
                                    },
                                }}
                            />
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default ChatMessage;
