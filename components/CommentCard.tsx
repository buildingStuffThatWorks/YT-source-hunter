import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageCircle, Star, CornerDownRight } from 'lucide-react';
import { Comment } from '../types';
import { analyzeComment } from '../services/analysisService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface CommentCardProps {
  comment: Comment;
  showContext?: boolean; // If true, shows parent if this is a reply
}

const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const { highlights } = analyzeComment(text);
  
  if (!highlights.length) return <span className="text-gray-300">{text}</span>;

  // Simple reconstruction for highlighting
  // Note: For complex overlapping, this needs a better algo. Assuming non-overlapping for regexes provided.
  let lastIndex = 0;
  const parts = [];
  
  highlights.sort((a, b) => a.start - b.start).forEach((h, i) => {
    if (h.start > lastIndex) {
      parts.push(<span key={`text-${i}`} className="text-gray-300">{text.slice(lastIndex, h.start)}</span>);
    }
    
    let colorClass = "bg-blue-500/20 text-blue-300 border-b border-blue-500/50";
    if (h.type === 'source') colorClass = "bg-green-500/20 text-green-300 font-bold border-b-2 border-green-500";
    if (h.type === 'bracket') colorClass = "bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/50";

    parts.push(
      <span key={`high-${i}`} className={`px-1 rounded-sm ${colorClass}`}>
        {text.slice(h.start, h.end)}
      </span>
    );
    lastIndex = h.end;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="text-end" className="text-gray-300">{text.slice(lastIndex)}</span>);
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{parts}</p>;
};

const CommentCard: React.FC<CommentCardProps> = ({ comment, showContext }) => {
  // Fetch parent if context is requested and parentId exists
  const parent = useLiveQuery(
    () => (showContext && comment.parentId) ? db.comments.get(comment.parentId) : Promise.resolve(undefined),
    [comment.parentId, showContext]
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3 hover:border-gray-600 transition-colors">
      
      {/* Context: Parent Comment */}
      {parent && (
        <div className="mb-3 pl-3 border-l-2 border-gray-600 opacity-70">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-gray-400">{parent.authorName}</span>
             <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(parent.publishedAt))} ago</span>
           </div>
           <p className="text-xs text-gray-400 line-clamp-2">{parent.textOriginal}</p>
        </div>
      )}

      {/* Main Comment Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
           <img 
            src={comment.authorProfileImageUrl || `https://ui-avatars.com/api/?name=${comment.authorName}&background=random`} 
            alt={comment.authorName}
            className="w-6 h-6 rounded-full"
           />
           <span className="text-sm font-semibold text-white">{comment.authorName}</span>
           <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.publishedAt))} ago</span>
           {comment.isPinned && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded">Pinned</span>}
        </div>
        {comment.score > 50 && (
            <div className="flex items-center gap-1 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800">
                <Star className="w-3 h-3 text-green-400 fill-green-400" />
                <span className="text-xs font-medium text-green-400">Match</span>
            </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-3">
        <HighlightedText text={comment.textOriginal} />
      </div>

      {/* Footer / Stats */}
      <div className="flex items-center gap-4 text-gray-500 text-xs">
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          <span>{comment.likeCount}</span>
        </div>
        {comment.parentId ? (
            <div className="flex items-center gap-1 text-gray-600">
                <CornerDownRight className="w-3 h-3" />
                <span>Reply</span>
            </div>
        ) : (
            <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{comment.replyCount} replies</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
